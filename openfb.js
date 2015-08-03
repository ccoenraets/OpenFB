/**
 * OpenFB is a micro-library that lets you integrate your JavaScript application with Facebook.
 * OpenFB works for both BROWSER-BASED apps and CORDOVA/PHONEGAP apps.
 * This library has no dependency: You don't need (and shouldn't use) the Facebook SDK with this library. Whe running in
 * Cordova, you also don't need the Facebook Cordova plugin. There is also no dependency on jQuery.
 * OpenFB allows you to login to Facebook and execute any Facebook Graph API request.
 * @author Christophe Coenraets @ccoenraets
 * @version 0.5
 */
var openFB = (function () {

	var loginURL = 'https://www.facebook.com/dialog/oauth',

		logoutURL = 'https://www.facebook.com/logout.php',

		authResponse = null,

		disconnected = false,

	// By default we store fbtoken in sessionStorage. This can be overridden in init()
		tokenStore = window.sessionStorage,

	// The Facebook App Id and/or Secret. Required. Set using init().
		fbAppId,
		fbAppSecret,

		context = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/')),

		baseURL = location.protocol + '//' + location.hostname + (location.port ? ':' + location.port : '') + context,

	// Default OAuth redirect URL. Can be overriden in init()
		oauthRedirectURL = baseURL + '/oauthcallback.html',

	// Default Cordova OAuth redirect URL. Can be overriden in init()
		cordovaOAuthRedirectURL = 'https://www.facebook.com/connect/login_success.html',

	// Default Logout redirect URL. Can be overriden in init()
		logoutRedirectURL = baseURL + '/logoutcallback.html',

	// Because the OAuth login spans multiple processes, we need to keep the login callback function as a variable
	// inside the module instead of keeping it local within the login function.
		loginCallback,

	// Indicates if the app is running inside Cordova
		runningInCordova = !/^(http(s)?:\/\/)/g.test(window.document.URL),

	// Used in the exit event handler to identify if the login has already been processed elsewhere (in the oauthCallback function)
		loginProcessed,

	// Used in the exit event handler to identify if the logout has already been processed elsewhere (in the logoutCallback function)
		logoutProcessed;

	/**
	 * Initialize the OpenFB module. You must use this function and initialize the module with an appId before you can
	 * use any other function.
	 * @param params - init paramters
	 *  appId: (Required) The id of the Facebook app,
	 *  tokenStore: (optional) The store used to save the Facebook token. If not provided, we use sessionStorage.
	 *  loginURL: (optional) The OAuth login URL. Defaults to https://www.facebook.com/dialog/oauth.
	 *  logoutURL: (optional) The logout URL. Defaults to https://www.facebook.com/logout.php.
	 *  oauthRedirectURL: (optional) The OAuth redirect URL. Defaults to [baseURL]/oauthcallback.html.
	 *  cordovaOAuthRedirectURL: (optional) The OAuth redirect URL. Defaults to https://www.facebook.com/connect/login_success.html.
	 *  logoutRedirectURL: (optional) The logout redirect URL. Defaults to [baseURL]/logoutcallback.html.
	 */
	function init(params) {
		if (params.appId) {
			fbAppId = params.appId;
		} else {
			throw 'appId parameter not set in init()';
		}

		if (params.appSecret) {
			fbAppSecret = params.appSecret;
		} else {
			throw 'secretId parameter not set in init()';
		}

		if (params.tokenStore) {
			tokenStore = params.tokenStore;
		}

		// keep running after application has been closed
		if(tokenStore.fbAuthResponse){
			authResponse = JSON.parse(tokenStore.fbAuthResponse);
		}

		loginURL = params.loginURL || loginURL;
		logoutURL = params.logoutURL || logoutURL;
		oauthRedirectURL = params.oauthRedirectURL || oauthRedirectURL;
		cordovaOAuthRedirectURL = params.cordovaOAuthRedirectURL || cordovaOAuthRedirectURL;
		logoutRedirectURL = params.logoutRedirectURL || logoutRedirectURL;
	}

	/**
	 * Inspecting access tokens
	 */
	function debugToken(tokenToInspect, appTokenOrAdminToken, callback){
		graph({ path:'/debug_token',
			params: { input_token:tokenToInspect, access_token:appTokenOrAdminToken },
			success:function(response){
				if (callback) callback(response.data||{});
			},
			error:function(error){
				if (callback) callback({});
			}
		});
	}

	/**
	 * Checks if the user has logged in with openFB and currently has a session api token.
	 * @param callback the function that receives the loginstatus
	 */
	function getLoginStatus(callback) {
		var token = authResponse ? authResponse.accessToken : null,
			loginStatus = {};
		if (token) {
			debugToken(token, fbAppId+'|'+fbAppSecret, function(response){
				if(response.is_valid) {
					loginStatus.status = 'connected';
					loginStatus.authResponse = authResponse;
				} else {
					loginStatus.status = 'revoked_access';
					tokenStore.removeItem('fbAuthResponse');
					tokenStore.removeItem('fbtoken');
					authResponse = null;
				}
				if (callback) callback(loginStatus);
			});
		} else {
			loginStatus.status = 'unknown';
			if (callback) callback(loginStatus);
		}
	}

	/**
	 * Login to Facebook using OAuth. If running in a Browser, the OAuth workflow happens in a a popup window.
	 * If running in Cordova container, it happens using the In-App Browser. Don't forget to install the In-App Browser
	 * plugin in your Cordova project: cordova plugins add org.apache.cordova.inappbrowser.
	 *
	 * @param callback - Callback function to invoke when the login process succeeds
	 * @param options - options.scope: The set of Facebook permissions requested
	 * @returns {*}
	 */
	function login(callback, options) {

		var loginWindow,
			startTime,
			scope = '',
			redirectURL = runningInCordova ? cordovaOAuthRedirectURL : oauthRedirectURL;

		if (!fbAppId) {
			return callback({ status:'unknown', error:'Facebook App Id not set.' });
		}

		// `cordova-plugin-network-information` offline handler: Used when running in Cordova only
		function document_offline(evt){
			disconnected = true;
			loginWindow.close();
		}

		// Inappbrowser load start handler: Used when running in Cordova only
		function loginWindow_loadStartHandler(evt) {
			var url = evt.url;
			if (url.indexOf('access_token=') > 0 || url.indexOf('error=') > 0) {
				// When we get the access token fast, the login window (inappbrowser) is still opening with animation
				// in the Cordova app, and trying to close it while it's animating generates an exception. Wait a little...
				var timeout = 600 - (new Date().getTime() - startTime);
				setTimeout(function () {
					loginWindow.close();
				}, timeout > 0 ? timeout : 0);
				oauthCallback(url);
			}
		}

		// Inappbrowser load stop handler fires when loading is complete: Used when running in Cordova only
		function loginWindow_loadStopHandler(evt){
			// N/A yet.
		}

		// Inappbrowser exit handler: Used when running in Cordova only
		function loginWindow_exitHandler() {
			console.log('exit and remove listeners');
			// Handle the situation where the user closes the login window manually before completing the login process
			if (loginCallback && !loginProcessed) loginCallback({status:disconnected?'user_disconnected':'user_cancelled'});
			document.removeEventListener('offline', document_offline);
			loginWindow.removeEventListener('loadstart', loginWindow_loadStartHandler);
			loginWindow.removeEventListener('loadstop', loginWindow_loadStopHandler);
			loginWindow.removeEventListener('exit', loginWindow_exitHandler);
			loginWindow = null;
			disconnected = false;
			console.log('done removing listeners');
		}

		if (options && options.scope) {
			scope = options.scope;
		}

		loginCallback = callback;
		loginProcessed = false;

		startTime = new Date().getTime();
		loginWindow = window.open(loginURL + '?client_id=' + fbAppId + '&redirect_uri=' + redirectURL +
			'&response_type=token,signed_request,code&scope=' + scope, '_blank', 'location=no,clearcache=yes,zoom=no');

		// If the app is running in Cordova, listen to URL changes in the InAppBrowser until we get a URL with an access_token or an error
		if (runningInCordova) {
			document.addEventListener('offline', document_offline, false);
			loginWindow.addEventListener('loadstart', loginWindow_loadStartHandler);
			loginWindow.addEventListener('loadstop', loginWindow_loadStopHandler);
			loginWindow.addEventListener('exit', loginWindow_exitHandler);
		}
		// Note: if the app is running in the browser the loginWindow dialog will call back by invoking the
		// oauthCallback() function. See oauthcallback.html for details.

	}

	/**
	 * Called either by oauthcallback.html (when the app is running the browser) or by the loginWindow loadstart event
	 * handler defined in the login() function (when the app is running in the Cordova/PhoneGap container).
	 * @param url - The oautchRedictURL called by Facebook with the access_token in the querystring at the ned of the
	 * OAuth workflow.
	 */
	function oauthCallback(url) {
		// Parse the OAuth data received from Facebook
		var queryString,
			obj;
		
		loginProcessed = true;
		logoutProcessed = false;
		if (url.indexOf('access_token=') > 0) {
			queryString = url.substr(url.indexOf('#') + 1);
			obj = parseQueryString(queryString);
			authResponse = { accessToken:obj['access_token'], expiresIn:obj['expires_in'], signedRequest:obj['signed_request'], userID:decodeSignedRequest(obj['signed_request']).user_id };
			tokenStore.fbAuthResponse = JSON.stringify(authResponse);
			if (loginCallback) loginCallback({ status:'connected', authResponse:authResponse });
		} else if (url.indexOf('error=') > 0) {
			queryString = url.substring(url.indexOf('?') + 1, url.indexOf('#'));
			obj = parseQueryString(queryString);
			if (loginCallback) loginCallback({status:'not_authorized', error: obj.error});
		} else {
			if (loginCallback) loginCallback({status:'not_authorized'});
		}
	}
	
	function getAuthResponse(callback){
		typeof callback === 'function' && callback(authResponse);
		return authResponse;
	}

	/**
	 * Logout from Facebook, and remove the token.
	 * IMPORTANT: For the Facebook logout to work, the logoutRedirectURL must be on the domain specified in "Site URL" in your Facebook App Settings
	 * e.g. https://rawgit.com/ccoenraets/OpenFB/master/logoutcallback.html
	 */
	function logout(callback) {
		var logoutWindow,
			token = authResponse ? authResponse.accessToken : null;

		/* Remove token. Will fail silently if does not exist */
		tokenStore.removeItem('fbAuthResponse');
		tokenStore.removeItem('fbtoken');
		authResponse = null;

		if (token && !logoutProcessed) {
			logoutProcessed = true;
			logoutWindow = window.open(logoutURL + '?confirm=1&access_token=' + token + '&next=' + logoutRedirectURL, '_blank', 'location=no,clearcache=yes,zoom=no');
			if (runningInCordova) {
				setTimeout(function() {
					logoutWindow.close();
				}, 700);
			}
		}

		if (callback) {
			callback();
		}

	}

	/**
	 * Lets you make any Facebook Graph API request.
	 * @param obj - Request configuration object. Can include:
	 *  method:  HTTP method: GET, POST, etc. Optional - Default is 'GET'
	 *  path:    path in the Facebook graph: /me, /me.friends, etc. - Required
	 *  params:  queryString parameters as a map - Optional
	 *  success: callback function when operation succeeds - Optional
	 *  error:   callback function when operation fails - Optional
	 */
	function api(obj) {
		obj.params = obj.params || {};
		obj.params['access_token'] = authResponse ? authResponse.accessToken : null;
		graph(obj);
	}

	/**
	 * Graph API
	 * @param obj - Request configuration object. Can include:
	 *  method:  HTTP method: GET, POST, etc. Optional - Default is 'GET'
	 *  path:    path in the Facebook graph: /me, /me.friends, etc. - Required
	 *  params:  queryString parameters as a map - Optional
	 *  success: callback function when operation succeeds - Optional
	 *  error:   callback function when operation fails - Optional
	 */
	function graph(obj) {
		var method = obj.method || 'GET',
			params = obj.params || {},
			xhr = new XMLHttpRequest(),
			url;

		url = 'https://graph.facebook.com' + obj.path + '?' + toQueryString(params);
		
		xhr.onreadystatechange = function () {
			if (xhr.readyState === 4) {
				if (xhr.status === 200) {
					if (obj.success) obj.success(JSON.parse(xhr.responseText));
				} else {
					var error = xhr.responseText ? JSON.parse(xhr.responseText).error : {message: 'An error has occurred'};
					if (obj.error) obj.error(error);
				}
			}
		};

		xhr.open(method, url, true);
		xhr.send();
	}

	/**
	 * Helper function to de-authorize the app
	 * @param success
	 * @param error
	 * @returns {*}
	 */
	function revokePermissions(success, error) {
		return api({method: 'DELETE',
			path: '/me/permissions',
			success: function () {
				success();
			},
			error: error});
	}

	function parseQueryString(queryString) {
		var qs = decodeURIComponent(queryString),
			obj = {},
			params = qs.split('&');
		params.forEach(function (param) {
			var splitter = param.split('=');
			obj[splitter[0]] = splitter[1];
		});
		return obj;
	}

	function toQueryString(obj) {
		var parts = [];
		for (var i in obj) {
			if (obj.hasOwnProperty(i)) {
				parts.push(encodeURIComponent(i) + '=' + encodeURIComponent(obj[i]));
			}
		}
		return parts.join('&');
	}
	
	function utf8Decode(str_data){
		var tmp_arr = [], i = 0, ac = 0, c1 = 0, c2 = 0, c3 = 0;
		str_data += '';
		while (i < str_data.length) {
			c1 = str_data.charCodeAt(i);
			if(c1 < 128){
				tmp_arr[ac++] = String.fromCharCode(c1);
				i++;
			}else if (c1 > 191 && c1 < 224){
				c2 = str_data.charCodeAt(i + 1);
				tmp_arr[ac++] = String.fromCharCode(((c1 & 31) << 6) | (c2 & 63));
				i += 2;
			}else{
				c2 = str_data.charCodeAt(i + 1);
				c3 = str_data.charCodeAt(i + 2);
				tmp_arr[ac++] = String.fromCharCode(((c1 & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
				i += 3;
			}
		}
		return tmp_arr.join('');
	}
	
	function base64Decode(data){
		var b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
		var o1, o2, o3, h1, h2, h3, h4, bits, i = 0, ac = 0, dec = '', tmp_arr = [];
		if(!data){
			return data;
		}
		data += '';
		do{ // Unpack four hexets into three octets using index points in b64
			h1 = b64.indexOf(data.charAt(i++));
			h2 = b64.indexOf(data.charAt(i++));
			h3 = b64.indexOf(data.charAt(i++));
			h4 = b64.indexOf(data.charAt(i++));
			bits = h1 << 18 | h2 << 12 | h3 << 6 | h4;
			o1 = bits >> 16 & 0xff;
			o2 = bits >> 8 & 0xff;
			o3 = bits & 0xff;
			if(h3 == 64){
				tmp_arr[ac++] = String.fromCharCode(o1);
			}else if (h4 == 64){
				tmp_arr[ac++] = String.fromCharCode(o1, o2);
			}else{
				tmp_arr[ac++] = String.fromCharCode(o1, o2, o3);
			}
		} while(i < data.length);
		dec = tmp_arr.join('');
		dec = utf8Decode(dec);
		return dec;
	}
	
	function decodeSignedRequest(signedRequest){
		signedRequest = signedRequest.split('.');
		var encodedSig = signedRequest[0];
		var payload = signedRequest[1];
		var sig = base64Decode(encodedSig);
		payload = base64Decode(payload);
		// Removing null character \0 from the JSON data
		payload = payload.replace(/\0/g, '');
		var data = JSON.parse(payload);
		if(data.algorithm.toUpperCase() != 'HMAC-SHA256'){
			return 'Unknown algorithm. Expected HMAC-SHA256';
		}
		// TODO: Check signature!
		return data;
	}

	// The public API
	return {
		init: init,
		login: login,
		logout: logout,
		getAuthResponse: getAuthResponse,
		revokePermissions: revokePermissions,
		api: api,
		graph: graph,
		oauthCallback: oauthCallback,
		getLoginStatus: getLoginStatus
	}
}());
