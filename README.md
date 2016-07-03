# simple-multimedia-slideshow
Transition between images, videos, and other sites in a slideshow. Handles preloading and injecting content. [demo](http://www.adamkewley.com/files/foyer-slideshow/index.html)

# Usage 

`html`
```html
<div id="slideshow-here"></div>
```

`your-javascript-file.js`
```javascript
	var elementThatHousesSlideshow = document.getElementById("slideshow-here");
	
	var entries = [
	    // Duration is in seconds
		{ path: "relative-to-page/path", type: "website", duration: 10 },
		{ path: "funny-cat.jpg", type: "image", duration: 5 },
		{ path: "some-video.mp4", type: "video", duration: 50 }
	];

	var slideshow = new SimpleMultimediaSlideshow({
		element: elementThatHousesSlideShow
	});

	slideshow.start();
```

## Options

### `element: HTMLElement`
*required*. The element to show the slideshow in.

### `entries: Array.<Entry>`
*Optional, default: `[]`*. An array containing `Entry` objects. An entry object has the following keys:

```javascript
var entry = {
  path: "a-valid-url",
  type: "image|video|website",
  duration: 50
}
```

#### `path: CONTENT_PATH`
Path to the entry's content. Relative paths are resolved as normal (that is, relative to the page).

#### `type: "image" | "video" | "website"`
The type of content at the path.

#### `duration: duration`
The duration to show the slide for, in milliseconds.

### `fadeDuration: milliseconds`
*Optional, default: `500`*. The time taken to fade between slides

### `onFeedback: callback`
*Optional*. Register a callback function that will be called whenever general feedback messages are echoed by `SimpleMultimediaSlideshow`. You may also subscribe to this event after an instance is constructed via `slideshow.onFeedback.add(callback)`. The callback shall be called with a single string argument containing a feedback message:

```javascript
var slideshow = new SimpleMultimediaSlideshow({
	// ...
	onFeedback: function(feedbackMessage) {
		console.log("FEEDBACK: " + feedbackMessage);
	}
});
```

### `onError: callback`
*Optional* Register a callback function that will be called whenever error messages are echoed by `SimpleMultimediaSlideshow`. You may also subscribe after an instance is constructed via `slideshow.onError.all(callback);`. The callback shall be called with a single string argument containing a feedback message:

```javascript
var slideshow = new SimpleMultimediaSlideshow({
	// ...
	onError: function(errorMessage) {
		console.log("ERROR OCCURED IN SLIDESHOW: " + errorMessage);
		slideshow.stop();
	}
});
```

### `onStopped: callback`
*Optional* Register a callback function that will be called whenever the slideshow has been stopped. You may also subscribe to this event after an instance has been constructed via `slideshow.onStopped.add(callback);` The callback shall be called with no arguments.

```javascript
var slideshow = new SimpleMultimediaSlideshow({
    // ...
	onStopped: function() {
		console.log("Slideshow was stopped");
	}
});
```
