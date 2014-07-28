var createOpenOAuth = function (params) {
    // Use jQuery $extend would make this much easier but will make this depend on jQuery.
    var tokenKey,
        tokenStore,
        loginUrl,
        // Indicates if the app is running inside Cordova
        isRunningInCordova = !!window.cordova || !!window.phonegap;;

    if (params.loginUrl) {
        loginUrl = params.loginUrl;
    } else {
        throw 'loginUrl parameter not set';
    }
    if (params.tokenKey) {
        tokenKey = params.tokenKey;
    } else {
        throw 'tokenKey parameter not set';
    }

    if (params.tokenStore) {
        tokenStore = params.tokenStore;
    } else {
        tokenStore = window.localStorage;
    }

    function getToken() {
        return tokenStore[tokenKey];
    }

    function setToken(token) {
        tokenStore[tokenKey] = token;
    }

    function removeToken() {
        tokenStore.removeItem(tokenKey);
    }

    /**
     * Checks if the user has logged in with OpenOAuth and currently has a session api token.
     * @param callback the function that receives the loginstatus
     */
    function getLoginStatus(callback) {
        var token = getToken(),
            loginStatus = {};
        if (token) {
            loginStatus.status = 'connected';
            loginStatus.authResponse = {token: token};
        } else {
            loginStatus.status = 'unknown';
        }
        if (callback) {
            callback(loginStatus);
        }
    }

    function login(oauthCallback) {
        var startTime = new Date().getTime(),
            loginWindow = window.open(loginUrl, '_blank', 'location=no');

        // Inappbrowser load start handler: Used when running in Cordova only
        function loginWindow_loadStartHandler(event) {
            var url = event.url;
            if (url.indexOf("access_token=") > 0 || url.indexOf("error=") > 0) {
                // When we get the access token fast, the login window (inappbrowser) is still opening with animation
                // in the Cordova app, and trying to close it while it's animating generates an exception. Wait a little...
                var timeout = 600 - (new Date().getTime() - startTime);
                setTimeout(function () {
                    loginWindow.close();
                }, timeout > 0 ? timeout : 0);
                oauthCallback(url);
            }
        }

        // Inappbrowser exit handler: Used when running in Cordova only
        function loginWindow_exitHandler() {
            console.log('exit and remove listeners');
            // Handle the situation where the user closes the login window manually before completing the login process
            // deferredLogin.reject({error: 'user_cancelled', error_description: 'User cancelled login process', error_reason: "user_cancelled"});
            loginWindow.removeEventListener('loadstart', loginWindow_loadStartHandler);
            loginWindow.removeEventListener('exit', loginWindow_exitHandler);
            loginWindow = null;
            console.log('done removing listeners');
        }


        // If the app is running in Cordova, listen to URL changes in the InAppBrowser until we get a URL with an access_token or an error
        if (isRunningInCordova) {
            loginWindow.addEventListener('loadstart', loginWindow_loadStartHandler);
            loginWindow.addEventListener('exit', loginWindow_exitHandler);
        }
        // Note: if the app is running in the browser the loginWindow dialog will call back by invoking the
        // oauthCallback() function. See oauthcallback.html for details.

    }

    function logout(logoutUrl, callback) {
        if (getToken()) {
            var logoutWindow = window.open(logoutUrl, '_blank', 'location=no');
            if (isRunningInCordova) {
                setTimeout(function() {
                    logoutWindow.close();
                }, 700);
            }
        }

        /* Remove token. Will fail silently if does not exist */
        removeToken();

        if (callback) {
            callback();
        }

    }

    /**
     * Lets you make any Facebook Graph API request.
     * @param obj - Request configuration object. Can include:
     *  method:  HTTP method: GET, POST, etc. Optional - Default is 'GET'
     *  url::    Url to call - Required
     *  success: callback function when operation succeeds - Optional
     *  error:   callback function when operation fails - Optional
     */
    function api(obj) {

        var method = obj.method || 'GET',
            xhr = new XMLHttpRequest();

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

        xhr.open(method, obj.url, true);
        xhr.send();
    }

    // The public API
    return {
        getToken: getToken,
        setToken: setToken,
        removeToken: removeToken,
        getLoginStatus: getLoginStatus,
        login: login,
        logout: logout,
        api: api
    }
}
/**
 * OpenFB is a micro-library that lets you integrate your JavaScript application with Facebook.
 * OpenFB works for both BROWSER-BASED apps and CORDOVA/PHONEGAP apps.
 * This library has no dependency: You don't need (and shouldn't use) the Facebook SDK with this library. Whe running in
 * Cordova, you also don't need the Facebook Cordova plugin. There is also no dependency on jQuery.
 * OpenFB allows you to login to Facebook and execute any Facebook Graph API request.
 * @author Christophe Coenraets @ccoenraets
 * @version 0.4
 */
var createFB = function () {

    var FB_LOGIN_URL = 'https://www.facebook.com/dialog/oauth',
        FB_LOGOUT_URL = 'https://www.facebook.com/logout.php',
        FB_API_URL = 'https://graph.facebook.com',

        fbAppId,

        context = window.location.pathname.substring(0, window.location.pathname.indexOf("/",2)),

        baseURL = location.protocol + '//' + location.hostname + (location.port ? ':' + location.port : '') + context,

	// Moved calculate of these two values into init function
	// Requires call init function after device ready to calculate correctly
        oauthRedirectURL = '',
        logoutRedirectURL = '',

        // Because the OAuth login spans multiple processes, we need to keep the login callback function as a variable
        // inside the module instead of keeping it local within the login function.
        loginCallback,

        // Used in the exit event handler to identify if the login has already been processed elsewhere (in the oauthCallback function)
        loginProcessed,

	// Store login scope instead of pass in each time login is called
	// I do not see the need of dynamically change scope in each login call
	loginScope,

        // Gradually move things here to support other services in the future
        openOAuth;

    /**
     * Initialize the OpenFB module. You must use this function and initialize the module with an appId before you can
     * use any other function.
     * @param params - init paramters
     *  appId: The id of the Facebook app,
     *  tokenStore: The store used to save the Facebook token. Optional. If not provided, we use sessionStorage.
     */
    function init(params) {
        if (params.appId) {
            fbAppId = params.appId;
        } else {
            throw 'appId parameter not set in init()';
        }

	if (params.loginScope) {
	    loginScope = params.loginScope;
	} else {
            throw 'loginScope parameter not set in init()';
        }

	// phonegap is for old version support
	var runningInCordova = !!window.cordova || !!window.phonegap;

        if (runningInCordova) {
	    // Login works with pretty much anything such as http://localhost
            oauthRedirectURL = "https://www.facebook.com/connect/login_success.html";
	    // This is the only url I found works for logout when you do not have your own server
            logoutRedirectURL = "https://www.facebook.com/connect/login_success.html";
        }
	else {
            oauthRedirectURL = baseURL + '/oauthcallback.html';
            logoutRedirectURL = baseURL + '/logoutcallback.html';
	}
    	console.log(oauthRedirectURL);
    	console.log(logoutRedirectURL);

	var loginUrl = FB_LOGIN_URL + '?client_id=' + fbAppId + '&redirect_uri=' + oauthRedirectURL +
            '&response_type=token&scope=' + loginScope;
	console.log(loginUrl);

	if (!params.tokenKey) {
            params['tokenKey'] = 'fbtoken';
        }
        if (!params.loginUrl) {
            params['loginUrl'] = loginUrl;
        }
        openOAuth = createOpenOAuth(params);

    }

    /**
     * Checks if the user has logged in with openFB and currently has a session api token.
     * @param callback the function that receives the loginstatus
     */
    function getLoginStatus(callback) {
        openOAuth.getLoginStatus(callback);
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
        if (!fbAppId) {
            return callback({status: 'unknown', error: 'Facebook App Id not set.'});
        }

        loginCallback = callback;
        loginProcessed = false;

	openOAuth.login(oauthCallback);
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
        if (url.indexOf("access_token=") > 0) {
            queryString = url.substr(url.indexOf('#') + 1);
            obj = parseQueryString(queryString);
            openOAuth.setToken(obj['access_token']);
            if (loginCallback) loginCallback({status: 'connected', authResponse: {token: obj['access_token']}});
        } else if (url.indexOf("error=") > 0) {
            queryString = url.substring(url.indexOf('?') + 1, url.indexOf('#'));
            obj = parseQueryString(queryString);
            if (loginCallback) loginCallback({status: 'not_authorized', error: obj.error});
        } else {
            if (loginCallback) loginCallback({status: 'not_authorized'});
        }
    }

    /**
     * Logout from Facebook, and remove the token.
     * IMPORTANT: For the Facebook logout to work, the logoutRedirectURL must be on the domain specified in "Site URL" in your Facebook App Settings
     *
     */
    function logout(callback) {
        var logoutUrl = FB_LOGOUT_URL + '?access_token=' + openOAuth.getToken() + '&next=' + logoutRedirectURL;

	openOAuth.logout(logoutUrl, callback);
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
        var params = obj.params || {};
        params['access_token'] = openOAuth.getToken();
        obj['url'] = FB_API_URL + obj.path + '?' + toQueryString(params);

        openOAuth.api(obj);
    }

    function toQueryString(obj) {
        var parts = [];
        for (var i in obj) {
            if (obj.hasOwnProperty(i)) {
                parts.push(encodeURIComponent(i) + "=" + encodeURIComponent(obj[i]));
            }
        }
        return parts.join("&");
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
                openOAuth.removeToken();
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

    // The public API
    return {
        init: init,
        login: login,
        logout: logout,
        revokePermissions: revokePermissions,
        api: api,
        oauthCallback: oauthCallback,
        getLoginStatus: getLoginStatus
    }

};
var openFB = createFB();
