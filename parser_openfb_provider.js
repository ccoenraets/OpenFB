/**
* Based on Parse.FacebookUtils. A provider for use the modified openFB in Parse.
* @author Fernando Felix do Nascimento Junior* 
**/
(function(root) {
  root.Parse = root.Parse || {};
  var Parse = root.Parse;
  var _ = Parse._;

  var PUBLIC_KEY = "*";

  var initialized = false;
  var requestedPermissions;
  var initOptions;
  var provider = { // openfb auth provider
      authenticate: function(options) {
          var self = this;
          
          openFB.login(
              requestedPermissions,
              function(response) {
                  if (response.auth_response) {
                      if (options.success) {
                          
                          var parse_authData = {
                              id: response.auth_response.user_id,
                              access_token: response.auth_response.access_token,
                              expiration_date: new Date(response.auth_response.expires_in * 1000 +
                                                        (new Date()).getTime()).toJSON()
                          };                          
                          options.success(self, parse_authData);
                      }
                  } else {
                      if (options.error){
                          console.log("error");
                          options.error(self, response);
                      }
                  }
              },
              function (error){
                  if (options.error){
                      options.error(self, error)
                  }
              }
          );
      },
      restoreAuthentication: function(authData) {
          if (authData) {
              var auth_response = {
                  user_id: authData.id,
                  access_token: authData.access_token,
                  expires_in: (Parse._parseDate(authData.expiration_date).getTime() -
                              (new Date()).getTime()) / 1000
              };
              var newOptions = _.clone(initOptions);
              newOptions.auth_response = auth_response;

              // If the user doesn't match the one known by the open FB SDK, log out.
              // Most of the time, the users will match -- it's only in cases where
              // the open FB SDK knows of a different user than the one being restored
              // from a Parse User that logged in with username/password.
              var existingResponse = openFB.getAuthResponse();
              if (existingResponse &&
                  existingResponse.user_id !== auth_response.user_id) {
                  openFB.logout();
              }

              openFB.init(newOptions);
          }
          return true;
      },
      /**
       * Parse supports 2 auth types: facebook and twitter. Checkout here https://parse.com/docs/rest#users-linking
       **/
      getAuthType: function() {
          return "facebook";
      },
      deauthenticate: function() {
          this.restoreAuthentication(null);
      }
  };

  /**
   * Provides a set of utilities for using Parse with Facebook.
   * @namespace
   * Provides a set of utilities for using Parse with Facebook.
   */
  Parse.OpenFacebookUtils = {
    /**
     * Initializes Parse (custom OpenFB) Facebook integration.  Call this function after you
     * have loaded the custom openFB SDK with the same parameters as you would pass to custom openPB
     * Parse.FacebookUtils will invoke openFB.init() for you with these arguments.
     *
     * @param {Object} custom openFB init options
     */
    init: function(options) {      
      initOptions = _.clone(options) || {};
      openFB.init(initOptions);
      Parse.User._registerAuthenticationProvider(provider);
      initialized = true;
    },

    /**
     * Gets whether the user has their account linked to Facebook.
     * 
     * @param {Parse.User} user User to check for a facebook link.
     *     The user must be logged in on this device.
     * @return {Boolean} <code>true</code> if the user has their account
     *     linked to Facebook.
     */
    isLinked: function(user) {
      return user._isLinked("facebook");
    },

    /**
     * Logs in a user using Facebook. This method delegates to the Facebook
     * SDK to authenticate the user, and then automatically logs in (or
     * creates, in the case where it is a new user) a Parse.User.
     * 
     * @param {String, Object} permissions The permissions required for Facebook
     *    log in.  This is a comma-separated string of permissions.
     *    Alternatively, supply a Facebook authData object as described in our
     *    REST API docs if you want to handle getting facebook auth tokens
     *    yourself.
     * @param {Object} options Standard options object with success and error
     *    callbacks.
     */
    logIn: function(permissions, options) {
      if (!permissions || _.isString(permissions)) {
        if (!initialized) {
          throw "You must initialize OpenFacebookUtils before calling logIn.";
        }
        requestedPermissions = permissions;
        return Parse.User._logInWith("facebook", options);
      } else {
        var newOptions = _.clone(options) || {};
        newOptions.authData = permissions;
        return Parse.User._logInWith("facebook", newOptions);
      }
    },

    /**
     * Links Facebook to an existing PFUser. This method delegates to the
     * Facebook SDK to authenticate the user, and then automatically links
     * the account to the Parse.User.
     *
     * @param {Parse.User} user User to link to Facebook. This must be the
     *     current user.
     * @param {String, Object} permissions The permissions required for Facebook
     *    log in.  This is a comma-separated string of permissions. 
     *    Alternatively, supply a Facebook authData object as described in our
     *    REST API docs if you want to handle getting facebook auth tokens
     *    yourself.
     * @param {Object} options Standard options object with success and error
     *    callbacks.
     */
    link: function(user, permissions, options) {
      if (!permissions || _.isString(permissions)) {
        if (!initialized) {
          throw "You must initialize OpenFacebookUtils before calling link.";
        }
        requestedPermissions = permissions;
        return user._linkWith("facebook", options);
      } else {
        var newOptions = _.clone(options) || {};
        newOptions.authData = permissions;
        return user._linkWith("facebook", newOptions);
      }
    },

    /**
     * Unlinks the Parse.User from a Facebook account. 
     * 
     * @param {Parse.User} user User to unlink from Facebook. This must be the
     *     current user.
     * @param {Object} options Standard options object with success and error
     *    callbacks.
     */
    unlink: function(user, options) {
      if (!initialized) {
        throw "You must initialize OpenFacebookUtils before calling unlink.";
      }
      return user._unlinkFrom("facebook", options);
    }
  };
  
}(this));