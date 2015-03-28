# ngOpenFB #

ngOpenFB is an angular module that lets you integrate your JavaScript application with Facebook. Original idea is from the [OpenFB](https://github.com/ccoenraets/OpenFB) library by Christophe Coenraets rewritten for a better usage with Ionic and with Promise support.

ngOpenFB works for both browser-based angular apps and ionic apps. There is no dependency on the Facebook SDK!


### Getting Started ###

* Install ngOpenFB
```
bower install ngOpenFB
```

* Install the [InAppBrowser plugin](https://github.com/apache/cordova-plugin-inappbrowser) by cordova 
```bash
cordova plugin add cordova-plugin-inappbrowser
```

* Include ngOpenFb to your angular/ionic app
```javascript
angular.module('<YOUR_APP>', ['ngOpenFB'])
```

* Inject the $openFB service in your module
* Call the $openFB.init() function and set your Facebook App Id
```javascript
$openFB.init( {appId: '<YOUR_APP_ID>'} );
```

### Using the API ###

**Note:** all function calls support promises and callbacks.

Check Login status:
```javascript
$openFB.isLoggedIn()
.then(function( loginStatus ) {
    // logged in
} , function( err ) {
    // not logged in
});
```

Login using Facebook:
```javascript
$openFB.login({scope: 'email,user_friends'})
.then((function( status ) {
    // log in successful
}, function( err ) {
    // error logging in
})
```

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

Post on the user's feed:
```javascript
$openFB.api({
    method: 'POST',
    path: '/me/feed',
    params: {
        message: 'Testing the Facebook Graph API'
    },
    success: successHandler,
    error: errorHandler
});
```

Using a different url for your login callback:
```javascript
$openFB.init({
    appId : '<YOUR_APP_ID>'
    browserOauthCallback : <PATH_TO_YOUR_HOST> + '/oauthcallback.html'
    cordovaOauthCallback : <PATH_TO_YOUR_OTHER_HOST> + '/login_success.html'
})
```




### License ###
ngOpenFB is licensed under the MIT Open Source license. For more information, see the LICENSE file in this repository.



