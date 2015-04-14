
/*
 * ngOpenFB is an angular module that lets you integrate your JavaScript application with Facebook.
 * Original idea is from the OpenFB library by Christophe Coenraets https://github.com/ccoenraets/OpenFB
 * rewritten for a better usage with Ionic and Promise support.
#
 * ngOpenFB works for both BROWSER-BASED apps and IONIC apps.
#
 * To use this module you need to install the InAppBrowser plugin by cordova:
 * https://github.com/apache/cordova-plugin-inappbrowser
 * Execute 'cordova plugin add cordova-plugin-inappbrowser'
#
 * You also need to install ngCordova:
 * https://github.com/driftyco/ng-cordova/
 * Execute 'bower install ngCordova'
 * Or at the very least the $cordovaInAppBrowser service
#
 * There is no dependency on the Facebook SDK!
#
 * @author Robert Wettstädt
 * @version 0.1.3
 */

(function() {
  angular.module('ngOpenFB', ['ngCordova.plugins.inAppBrowser']).factory('$openFB', [
    '$window', '$q', '$rootScope', '$http', '$timeout', '$cordovaInAppBrowser', function($window, $q, $rootScope, $http, $timeout, $cordovaInAppBrowser) {
      var FB_LOGIN_URL, FB_LOGOUT_URL, baseURL, browserOauthCallback, context, cordovaOauthCallback, fbAppId, port, runningInCordova, tokenStore;
      FB_LOGIN_URL = 'https://www.facebook.com/dialog/oauth';
      FB_LOGOUT_URL = 'https://www.facebook.com/logout.php';

      /*
       * By default we store fbtoken in sessionStorage. This can be overridden in init()
       */
      tokenStore = $window.sessionStorage;
      context = $window.location.pathname.substring(0, window.location.pathname.indexOf('/', 2));
      port = location.port ? ':' + location.port : '';
      baseURL = location.protocol + "//" + location.hostname + port + context;

      /*
       * By default we use this environments base url for the callback page
       * and Facebooks default login_succes for the ionic platform.
       * This can be overriden in init().
      #
       * Take a look at the example oauthcallback.html in this directory.
       */
      browserOauthCallback = baseURL + '/oauthcallback.html';
      cordovaOauthCallback = 'https://www.facebook.com/connect/login_success.html';
      runningInCordova = false;
      fbAppId = void 0;
      document.addEventListener('deviceready', function() {
        return runningInCordova = true;
      }, false);
      return {

        /*
         * Initializes the ngOpenFB module. You must use this function and initialize the module with an appId before you can
         * use any other function.
        #
         * @param params: Required - Init paramters.
         *   appId        : Required - The id of the Facebook app.
         *   tokenStore   : Optional - The store used to save the Facebook token. If not provided, we use sessionStorage.
         *   browserOauthCallback : Optional - The URL to the Oauth Callback for the browser.
         *   cordovaOauthCallback : Optional - Tue URL to the Oauth Callback for the ionic app.
         */
        init: function(params) {
          if (params.appId) {
            fbAppId = params.appId;
          } else {
            throw 'appId parameter not set in init()';
          }
          if (params.browserOauthCallback) {
            browserOauthCallback = params.browserOauthCallback;
          }
          if (params.cordovaOauthCallback) {
            cordovaOauthCallback = params.cordovaOauthCallback;
          }
          if (params.logoutCallback) {
            browserOauthCallback = params.logoutCallback;
          }
          if (params.tokenStore) {
            return tokenStore = params.tokenStore;
          }
        },

        /*
         * Checks if the user has logged in with ngOpenFB and currently has a session api token.
        #
         * @param callback(result): Optional - The function that receives the loginStatus.
         */
        isLoggedIn: function(callback) {
          var loginStatus, q, token;
          q = $q.defer();
          token = tokenStore.fbtoken;
          loginStatus = {};
          if ((token != null) && token !== 'undefined') {
            loginStatus = {
              status: 'connected',
              authResponse: {
                token: token
              }
            };
            q.resolve(loginStatus);
          } else {
            delete tokenStore.fbtoken;
            loginStatus = {
              status: 'unknown'
            };
            q.reject(loginStatus);
          }
          if (callback) {
            callback(loginStatus);
          }
          return q.promise;
        },

        /*
         * Login to Facebook using OAuth. If running in a Browser, the OAuth workflow happens in a a popup window.
         * If running in Cordova container, it happens using the In App Browser Plugin.
        #
         * @param options: Required - Login options.
         *   scope: Required - The set of Facebook permissions requested (https://developers.facebook.com/docs/facebook-login/permissions/v2.3).
         *   location: Optional - Should the Facebook login window show the location toolbar? Default is true.
         * @param callback(err, result): Optional - The function to invoke when the login process succeeds.
        #
         * @returns promise
         */
        login: function(options, callback) {
          var exitHandler, exitListener, loadListener, loadStartHandler, location, loginUrl, q, startTime;
          if (options == null) {
            throw 'login() requires options paramter';
          }
          if ((options.scope == null) || typeof options.scope !== 'string') {
            throw 'login() options require scope parameter. E.g. "email,user_friends". Find information on scopes here https://developers.facebook.com/docs/facebook-login/permissions/v2.3';
          }
          q = $q.defer();

          /*
           * Inappbrowser load start handler: Used when running in Cordova only
           */
          loadStartHandler = (function(_this) {
            return function(evt, event) {
              var timeout, url;
              url = event.url;
              if (url.indexOf('access_token=') > 0 || url.indexOf('error=') > 0) {

                /*
                 * When we get the access token fast, the login window (inappbrowser) is still opening with animation
                 * in the Cordova app, and trying to close it while it's animating generates an exception. Wait a little...
                 */
                timeout = 600 - (new Date().getTime() - startTime);
                $timeout(function() {
                  return $cordovaInAppBrowser.close();
                }, Math.max(timeout, 0));
                loadListener();
                exitListener();
                return _this.oauthCallback(url, q, callback);
              }
            };
          })(this);

          /*
           * Inappbrowser exit handler: Used when running in Cordova only
           */
          exitHandler = function() {
            var error;
            console.log('exit and remove listeners');

            /*
             * Handle the situation where the user closes the login window manually before completing the login process
             */
            error = {
              error: 'user_cancelled',
              error_description: 'User cancelled login process',
              error_reason: "user_cancelled"
            };
            if (callback) {
              callback(error, null);
            }
            q.reject(error);
            loadListener();
            return exitListener();
          };
          if (fbAppId != null) {
            startTime = new Date().getTime();
            location = 'yes';
            if (options.location != null) {
              location = options.location ? 'yes' : 'no';
            }
            if (runningInCordova) {

              /*
               * If the app is running in Cordova, listen to URL changes in the InAppBrowser
               * until we get a URL with an access_token or an error.
               */
              loginUrl = FB_LOGIN_URL + "?client_id=" + fbAppId + "&redirect_uri=" + cordovaOauthCallback + "&response_type=token&scope=" + options.scope;
              loadListener = $rootScope.$on('$cordovaInAppBrowser:loadstart', loadStartHandler);
              exitListener = $rootScope.$on('$cordovaInAppBrowser:exit', exitHandler);
              $cordovaInAppBrowser.open(loginUrl, '_blank', {
                location: location
              });
            } else {

              /*
               * Else open a popup window which will - after a successful login - redirect to our callback
               * where an event on $rootscope will be broadcasted.
               */
              loginUrl = FB_LOGIN_URL + "?client_id=" + fbAppId + "&redirect_uri=" + browserOauthCallback + "&response_type=token&scope=" + options.scope;
              window.open(loginUrl, '_blank', "location=" + location);
              $rootScope.$on('ngOpenFB:loadend', (function(_this) {
                return function(event, url) {
                  return _this.oauthCallback(url, q, callback);
                };
              })(this));
            }
          } else {

            /*
             * Timeout to let the function return the promise first
             */
            $timeout(function() {
              var loginStatus;
              loginStatus = {
                status: 'unknown',
                error: 'Facebook App Id not set'
              };
              if (callback) {
                callback(loginStatus);
              }
              return q.reject(loginStatus);
            });
          }
          return q.promise;
        },

        /*
         * Helper function called after successful login including the url of the callback.
        #
         * @param url: Required - The oautchRedictURL called by Facebook with the access_token in the querystring.
         * @param q - Required - The promise to resolve or reject after finishing to parse oautchRedictURL.
         * @param callback(err, token) - Required - The function to invoke when the login process finishes.
         * @returns promise
         */
        oauthCallback: function(url, q, callback) {

          /*
           * Helper function
           */
          var loginStatus, obj, parseQueryString, queryString, token;
          parseQueryString = function(queryString) {
            var i, len, obj, param, params, qs, splitter;
            qs = decodeURIComponent(queryString);
            obj = {};
            params = qs.split('&');
            for (i = 0, len = params.length; i < len; i++) {
              param = params[i];
              splitter = param.split('=');
              obj[splitter[0]] = splitter[1];
            }
            return obj;
          };
          if (0 < url.indexOf('access_token=')) {
            queryString = url.substr(url.indexOf('#') + 1);
            obj = parseQueryString(queryString);
            token = obj['access_token'];
            tokenStore.fbtoken = token;
            loginStatus = {
              status: 'connected',
              authResponse: {
                token: obj['access_token']
              }
            };
            if (callback) {
              callback(null, token);
            }
            return q.resolve(token);
          } else if (0 < url.indexOf('error=')) {
            queryString = url.substring(url.indexOf('?') + 1, url.indexOf('#'));
            obj = parseQueryString(queryString);
            loginStatus = {
              status: 'not_authorized',
              error: obj.error
            };
            if (callback) {
              callback(loginStatus, null);
            }
            return q.reject(loginStatus);
          } else {
            loginStatus = {
              status: 'not_authorized'
            };
            if (callback) {
              callback(loginStatus, null);
            }
            return q.reject(loginStatus);
          }
        },

        /*
         * Lets you make any Facebook Graph API request.
         * @param options: Request configuration options.
         *   path    : Required - Path in the Facebook graph: /me, /me/friends, etc.
         *   method  : Optional - HTTP method: GET, POST, etc. Default is 'GET'.
         *   params  : Optional - QueryString parameters as a map
         * @param callback(err, result): Optional - The function to invoke when the API request finishes.
        #
         * @returns promise
         */
        api: function(options, callback) {
          var params, q, query, toQueryString, url, xhr;
          q = $q.defer();

          /*
           * Helper function
           */
          toQueryString = function(params) {
            var param, parts, value;
            parts = [];
            for (param in params) {
              value = params[param];
              if (params.hasOwnProperty(param)) {
                parts.push((encodeURIComponent(param)) + "=" + (encodeURIComponent(value)));
              }
            }
            return parts.join('&');
          };
          params = options.params || {};
          xhr = new XMLHttpRequest();
          params['access_token'] = tokenStore.fbtoken;
          query = toQueryString(params);
          url = "https://graph.facebook.com" + options.path + "?" + query;
          $http({
            method: options.method || 'GET',
            url: url
          }).then(function(res) {
            if (callback) {
              callback(null, res);
            }
            return q.resolve(res.data);
          }, function(err) {
            if (callback) {
              callback(err, null);
            }
            return q.reject(err);
          });
          return q.promise;
        },

        /*
         * De-authorize the app
         * @param callback(err, result): Optional - The function to invoke when the request finishes.
        #
         * @returns promise
         */
        revokePermissions: function(callback) {
          var q;
          q = $q.defer();
          this.api({
            method: 'DELETE',
            path: '/me/permissions'
          }).then(function(res) {
            tokenStore.fbtoken = void 0;
            if (callback) {
              callback(null, res);
            }
            return q.resolve();
          }, function(err) {
            if (callback) {
              callback(err, null);
            }
            return q.reject();
          });
          return q.promise;
        }
      };
    }
  ]);


  //#### Begin Individual Plugin Code ####

// install   :     cordova plugin add org.apache.cordova.inappbrowser
// link      :     https://github.com/apache/cordova-plugin-inappbrowser/blob/master/doc/index.md

angular.module('ngCordova.plugins.inAppBrowser', [])

  .provider('$cordovaInAppBrowser', [function () {

    var ref;
    var defaultOptions = this.defaultOptions = {};

    this.setDefaultOptions = function (config) {
      defaultOptions = angular.extend(defaultOptions, config);
    };

    this.$get = ['$rootScope', '$q', '$window', '$timeout', function ($rootScope, $q, $window, $timeout) {
      return {
        open: function (url, target, requestOptions) {
          var q = $q.defer();

          if (requestOptions && !angular.isObject(requestOptions)) {
            q.reject("options must be an object");
            return q.promise;
          }

          var options = angular.extend({}, defaultOptions, requestOptions);

          var opt = [];
          angular.forEach(options, function (value, key) {
            opt.push(key + '=' + value);
          });
          var optionsString = opt.join();

          ref = $window.open(url, target, optionsString);

          ref.addEventListener('loadstart', function (event) {
            $timeout(function () {
              $rootScope.$broadcast('$cordovaInAppBrowser:loadstart', event);
            });
          }, false);

          ref.addEventListener('loadstop', function (event) {
            q.resolve(event);
            $timeout(function () {
              $rootScope.$broadcast('$cordovaInAppBrowser:loadstop', event);
            });
          }, false);

          ref.addEventListener('loaderror', function (event) {
            q.reject(event);
            $timeout(function () {
              $rootScope.$broadcast('$cordovaInAppBrowser:loaderror', event);
            });
          }, false);

          ref.addEventListener('exit', function (event) {
            $timeout(function () {
              $rootScope.$broadcast('$cordovaInAppBrowser:exit', event);
            });
          }, false);

          return q.promise;
        },

        close: function () {
          ref.close();
          ref = null;
        },

        show: function () {
          ref.show();
        },

        executeScript: function (details) {
          var q = $q.defer();

          ref.executeScript(details, function (result) {
            q.resolve(result);
          });

          return q.promise;
        },

        insertCSS: function (details) {
          var q = $q.defer();

          ref.insertCSS(details, function (result) {
            q.resolve(result);
          });

          return q.promise;
        }
      };
    }];
  }]);


}).call(this);
