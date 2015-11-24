# ngOpenFB #

ngOpenFB is an angular module that lets you integrate your JavaScript application with Facebook. Original idea is from the [OpenFB](https://github.com/ccoenraets/OpenFB) library by Christophe Coenraets rewritten for a better usage with Ionic and with Promise support.

ngOpenFB works for both browser-based angular apps and ionic apps. There is no dependency on the Facebook SDK!

------

### Getting Started ###

1. Install ngOpenFB
  ```
  bower install ngOpenFB
  ```

2. Install the [InAppBrowser plugin](https://github.com/apache/cordova-plugin-inappbrowser) by cordova 
  ```bash
  cordova plugin add cordova-plugin-inappbrowser
  ```

3. Include ngOpenFb to your angular/ionic app
  ```javascript
  angular.module('<YOUR_APP>', ['ngOpenFB'])
  ```

4. Inject the $openFB service in your module
5. Call the $openFB.init() function and set your Facebook App Id
  ```javascript
  $openFB.init( {appId: '<YOUR_APP_ID>'} );
  ```

6. Copy the oauthcallback.html to your project

------

### Function overview ###

##### init(options)
Initializes the ngOpenFB module. You must use this function and initializes the module with an appId before you can use any other function.

###### Arguments
* options: Required - Init options.
  * appId: Required - The id of the Facebook app.
  * tokenStore: Optional - The store used to save the Facebook token. If not provided, we use sessionStorage.
  * browserOauthCallback: Optional - The URL to the Oauth Callback for the browser.
  * cordovaOauthCallback: Optional - Tue URL to the Oauth Callback for the ionic app.

======

##### isLoggedIn([callback])
Checks if the user has logged in with ngOpenFB and currently has a session api token.

###### Arguments
* callback(result): The function that receives the loginStatus.

###### Returns
* promise

======

##### login(options, [callback])
Login to Facebook using OAuth. If running in a Browser, the OAuth workflow happens in a a popup window. If running in Cordova container, it happens using the In App Browser Plugin.

###### Arguments
* options: Required - The login options.
  * scope: Required - The set of [Facebook permissions](https://developers.facebook.com/docs/facebook-login/permissions/v2.3) requested.
  * location: Optional - Should the Facebook login window show the location toolbar? Default is true.
* callback(err, token): Optional - The function to invoke when the login process finishes.

###### Returns
* promise

======

##### api(options, [callback])
Lets you make any Facebook Graph API request.

###### Arguments
* options: Required - Request configuration options.
  * path: Required - Path in the Facebook graph: /me, /me/friends, etc.
  * method: Optional - HTTP method: GET, POST, etc. Default is 'GET'.
  * params: Optional - QueryString parameters as a map
* callback(err, result): Optional - The function to invoke when the API request finishes.

###### Returns
* promise

======

##### revokePermissions([callback])
De-authorize the app

###### Arguments
* callback(err, result): Optional - The function to invoke when the request finishes.

###### Returns
* promise

------

### Examples ###

Check Login status:
```javascript
$openFB.isLoggedIn()
.then(function( loginStatus ) {
    // logged in
} , function( err ) {
    // not logged in
});
```

======

Login using Facebook:
```javascript
$openFB.login({scope: 'email,user_friends'})
.then(function( token ) {
    // log in successful
    // send token to your server
}, function( err ) {
    // error logging in
});
```

======

Fetch user's profile and profile picture:
```javascript
var me = {};
$openFB.api({path: '/me'})
.then(function( res ) {
    angular.extend(me, res);
, function( err ) {
    // error
});

$openFB.api({
    path: '/me/picture',
    params: {
        redirect: false,
        height: 64,
        width: 64
    }
}).then(function( res ) {
    angular.extend(me, {picture: res.data.url});
});
```

======

Post on the user's feed:
```javascript
$openFB.api({
    method: 'POST',
    path: '/me/feed',
    params: {
        message: 'Testing the Facebook Graph API'
    }, function( err, result ) {
        // Handle response from this callback
    }
});
```

======

Using a different url for your login callback:
```javascript
$openFB.init({
    appId : '<YOUR_APP_ID>'
    browserOauthCallback : <PATH_TO_YOUR_HOST> + '/oauthcallback.html'
    cordovaOauthCallback : <PATH_TO_YOUR_OTHER_HOST> + '/login_success.html'
})
```

------

### License ###
ngOpenFB is licensed under the MIT Open Source license. For more information, see the LICENSE file in this repository.