# OpenFB

OpenFB is a Micro-Library for Facebook integration in JavaScript apps running in the browser and in Cordova.

OpenFB has no dependency: You don't need the Facebook plugin when running in Cordova. You also don't need the Facebook SDK.

OpenFB allows you to login to Facebook and execute any Facebook Graph API request.

Here are a few code examples...

Login using Facebook:

```
openFB.login(callback, {scope: 'email,read_stream,publish_actions'});
```

Get the user's list of friends:

```
openFB.api({path: '/me/friends', success: successHandler, error: errorHandler});
```

Post on the user's feed:

```
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
```    

The approach used in OpenFB (plain OAuth + direct requests to Graph API endpoints) is simple and lightweight, but it is definitely not perfect.

Pros:
- No plugin dependency and no uncertainties when new versions of Cordova or the Facebook SDK are released.
- Works for all platforms, including platforms for which a version of the Facebook plugin doesn't exist. 
- Works for both browser-based apps and Cordova apps.

Cons:
- Not full-fledged, less out-of-the box features.
- Integration not as tight. For example, no native dialogs, etc.

## Browser and Cordova Apps
The library works for both browser-based apps and Cordova/PhoneGap apps. When running in a browser, the OAuth URL redirection workflow happens in a popup window. When running in Cordova, it happens inside an "In-App Browser".

## Getting Started

### Creating a Facebook application

1. Login to Facebook

1. Access [https://developers.facebook.com/apps](https://developers.facebook.com/apps), and click **Add New App**

1. Select **www** as the platform

1. Type a unique name for your app and click **Create New Facebook App ID** 

1. Specify a **Category**, and click **Create App ID**

1. Click **My Apps** in the menu and select the app you just created 

1. Click **Settings** in the left navigation

1. Click the **Advanced Tab**

1. In the **OAuth Settings** section, add the following URLs in the **Valid OAuth redirect URIs** field:
    - [http://localhost:8100/oauthcallback.html](http://localhost:8100/oauthcallback.html) (for access using ionic serve)
    - [https://www.facebook.com/connect/login_success.html](https://www.facebook.com/connect/login_success.html) (for access from Cordova)

1. Click **Save Changes**  

### Running the Sample in the Browser

1. Copy the Facebook App ID for the app you just created and paste it as the first argument of the openFB.init() method invocation in index.html.
1. Load index.html, from a location that matches the redirect URI you defined above. For example: http://localhost:8100

### Running the Sample in Cordova

1. Create a Cordova project

    ```
    cordova create sample com.openfb.sample sample
    ```

1. Add the InAppBrowser Plugin

    ```
    cd sample
    cordova plugins add org.apache.cordova.inappbrowser
    ```

1. Delete the contents of the ```www``` directory 
1. Copy ```index.html``` and ```openfb.js``` from the OpenFB project to the ```www``` directory of your Cordova project

    > Make sure your index.html includes ```<script src="cordova.js"></script>```. cordova.js does not need to (and shouldn't be) present in your ```www``` folder: it is automatically injected by the cordova build process.

1. Make sure you are in your Cordova project's root directory, add a platform, and build the project. For example: 

    ```
    cordova platform add ios
    cordova build ios
    ```
    
1. Run the project on device or in the emulator    


## AngularJS Wrapper

If you are using AngularJS, you can use ngOpenFB which provides a wrapper around the OpenFB library and allows you to use OpenFB "the Angular way":
- As an Angular service instead of a global object
- Using promises instead of callbacks
 
indexng.html provides an AngularJS sample. 

Check out the [Ionic Tutorial](https://ccoenraets.github.io/ionic-tutorial/) for a complete example.

## Summary

The Facebook Plugin is still the best technical solution to integrate your Cordova app with Facebook because it provides a tighter integration (using native dialogs, etc). However, if you are looking for a lightweight and easy-to-set-up solution with no dependencies, or if you are targeting mobile platforms for which an implementation of the plugin is not available, you may find this library useful as well.

