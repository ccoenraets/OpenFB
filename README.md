# OpenFB #

OpenFB is a micro-library that lets you integrate your JavaScript applications with Facebook. It works for both browser-based and Cordova/PhoneGap apps.

OpenFB has no dependency: You don't need the Facebook plugin when running in Cordova. You also don't need the Facebook SDK.

OpenFB allows you to login to Facebook and execute any Facebook Graph API request.

Here are a few code examples...

Login using Facebook:

    openFB.login(scope, successHandler, errorHandler);

Get the user's list of friends:

    openFB.api({path: '/me/friends', success: successHandler, error: errorHandler});

Post on the user's feed:

    openFB.api(
        {
            method: 'POST',
            path: '/me/feed',
            params: {
                message: 'Testing the Facebook Graph API'
            },
            success: successHandler,
            error: errorHandler
        });

The approach used in OpenFB (plain OAuth + direct requests to Graph API endpoints) is simple and lightweight, but it is definitely not perfect.

Pros:
- No plugin dependency and no uncertainties when new versions of Cordova or the Facebook SDK are released.
- Works for all platforms, including platforms for which a version of the plugin doesn't exist. 
- Works for both browser-based apps and Cordova apps.

Cons:
- Not full-fledged, less out-of-the box features.
- Integration not as tight. For example, no native dialogs, etc.

### Browser and Cordova Apps ###
The library works for both browser-based apps and Cordova/PhoneGap apps. When running in a browser, the OAuth URL redirection workflow happens in a popup window. When running in Cordova, it happens inside an "In-App Browser".

### Try it here ###
You can try the sample app here http://coenraets.org/apps/openfb/index.html (The name of my sample Facebook app is called Sociogram). This application is intentionally simplistic to keep the code readable and focused on the Facebook integration. The same app works inside Cordova.

### Getting Started ###
To run the sample on your own system:

1. Create a Facebook app here: https://developers.facebook.com/apps. In the advanced settings, make sure you declare a "Valid OAuth redirect URI". For example, if during development you access your application from http://localhost/openfb/index.html, you must declare http://localhost/openfb/oauthcallback.html as a valid redirect URI. Also add https://www.facebook.com/connect/login_success.html as a Valid OAuth redirect URI for access from Cordova.
2. Copy the Facebook App Id and paste it as the first argument of the openFB.init() method invocation in index.html.
3. Load index.html, from a location that matches the redirect URI you defined above. For example: http://localhost/openfb/index.html


### Cordova Instructions ###

To use OpenFB with Cordova, you need to install the inappbrowser plugin:

```
cordova plugins add org.apache.cordova.inappbrowser
```

### Summary ###

The Facebook Plugin is still the best technical solution to integrate your Cordova app with Facebook because it provides a tighter integration (using native dialogs, etc). However, if you are looking for a lightweight and easy-to-set-up solution with no dependencies, or if you are targeting mobile platforms for which an implementation of the plugin is not available, you may find this library useful as well.

