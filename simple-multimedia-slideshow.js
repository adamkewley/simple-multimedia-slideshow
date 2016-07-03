function SimpleMultimediaSlideshow(options) {
    if(options.element === undefined)
	throw "Must provide an element for the slideshow to be shown in";

    var doNothing = function() { };

    // TODO: check options.element is HTMLElement

    var self = this;

    var defaults = {
	entries: [],
	fadeDuration: 500,
	onFeedback: doNothing,
	onError: doNothing,
	onStopped: doNothing
    };

    var resolvedOptions = $.extend({}, defaults, options);

    var entries = resolvedOptions.entries;

    function Log() {
	var self = this;
	var feedbackMessageCallbacks = [];
	var errorMessageCallbacks = [];
	
	this.writeFeedback = function (feedback) {
	    feedbackMessageCallbacks.forEach(function(callback) {
		callback.call(self, feedback);
	    });
	};
	
	this.writeError = function (errorMessage) {
	    errorMessageCallbacks.forEach(function(callback) {
		callback.call(self, errorMessage);
	    });
	};
	
	this.onFeedbackMessgeReceived = function(callback) {
	    feedbackMessageCallbacks.push(callback);
	};
	
	this.onErrorMessageReceived = function(callback) {
	    errorMessageCallbacks.push(callback);
	};
    }

    // INTERNAL TYPES/FUNCTIONS

    var Event = function(beforeTrigger) {
	if(beforeTrigger === undefined)
	    beforeTrigger = doNothing;
	
	var subscribers = [];

	return {
	    add: function(callback) {
		subscribers.push(callback);
	    },
	    remove: function(callback) {
		var idx = subscribers.indexOf(callback);
		if(idx > -1)
		    subscribers.splice(idx, 1);
	    },
	    trigger: function(args) {
		beforeTrigger.call(self, args);

		subscribers.forEach(function(subscriber) {
		    subscriber.call(self, args);
		});
	    }
	};
    };

    var ImageEntry = function(path, log) {
	this.load = function() {
	    return new Promise(function(resolve, reject) {
		// Putting the image as the background image
		// of a container so that it stretches properly
		var container = document.createElement("div");
		container.className = "img-container";
		
		var image = new Image();
		
		image.src = path;
		
		log.writeFeedback("Loading image " + path);
		
		image.addEventListener("load", function() {
		    log.writeFeedback(path + " successfully loaded");
		    
		    container.style.backgroundImage = "url('" + path + "')";
		    
		    resolve(container);
		});
		
		image.addEventListener("error", function() {
		    var errorMessage =
			"Error occured when loading " + path;
		    
		    log.writeError(errorMessage);
		    reject(errorMessage);
		});
	    });
	};
	
	this.start = doNothing;
    };

    var WebsiteEntry = function(path, log) {
	this.load = function() {
	    return new Promise(function(resolve, reject) {
		var iframe = document.createElement("iframe");
		
		iframe.src = path;
		
		// TODO - PRELOAD
		resolve(iframe);		
	    });
	};

	this.start = doNothing;
    };

    var VideoEntry = function(path, log) {
	var videoElement = document.createElement("video");
	
	this.load = function() {
	    return new Promise(function(resolve, reject) {		
		videoElement.src = path;

		resolve(videoElement);
	    });
	};

	this.start = function() {
	    videoElement.controls = true;
	    videoElement.autoplay = true;
	};
    };

    var loadConfigEntry = function(entry, log) {
	var path = entry.path;

	switch(entry.type) {
	case "image":
	    return new ImageEntry(path, log);
	case "webpage":
	    return new WebsiteEntry(path, log);
	case "video":
	    return new VideoEntry(path, log);
	default:
	    var errorMessage =
		"Unknown entry type " + entry.type +
		" encountered";
	    
	    log.writeError(errorMessage);

	    return new Promise(
		function(_, reject) { reject(errorMessage); });
	}
    };

    function clearContentsOf(element) {
	while(element.firstChild)
	    element.removeChild(element.firstChild);
    }
    
    function fadeIn(element) {
	return new Promise(function(resolve, reject) {
	    $(element).fadeIn(resolvedOptions.fadeDuration, function() {
		resolve(element);
	    });
	});
    }
    
    function fadeOut(element) {
	return new Promise(function(resolve, reject) {
	    $(element).fadeOut(resolvedOptions.fadeDuration, function() {
		resolve(element);
	    });
	});
    }
    
    function transitionContentsOf(destination, newContent) {
	return fadeOut(destination)
	    .then(function() {
		clearContentsOf(destination);
		destination.appendChild(newContent);
		return fadeIn(destination);
	    });
    }
    
    function rotateArray(arr) {
	return arr.slice(1, arr.length).concat(arr.slice(0, 1));
    }

	/* Algorithm for loading slides:
           - Load slide config
           - Iterate through slides in config
           - For each row
           - Start to preload the data, returning the preload's promise
           - Set a timeout based on current slide's time (0 if first)
           - Make the timeout event hook into the promise's continuation
           - Once the data's preloaded AND the timeout event has triggered,
           fade out the slide element, clear it, show the new data
           - Start the process again
           - If a preload error occured then break through to the next
           iteration
	*/
	
    function progressToEntryAfter(minimumWaitTime, newEntry, log) {
	log.writeFeedback(
	    "Scheduling progression to " + newEntry.path);

	var returnVal = new Promise(function(accept, reject) {
	    // Start to preload the data
	    var nextEntry = loadConfigEntry(newEntry, log);
	    var nextEntryPromise = nextEntry.load();

	    // Set a minimum wait (showing previous slide)
	    var minimumWaitTimeout =
		setTimeout(function() {
		    
		    log.writeFeedback(
			"Current slide has shown for long enough. " +
			    " waiting for the next slide to finish preloading " +
			    " before transitioning.");
		    
		    // Once the timeout has triggered, try
		    // to transition the contents of the
		    // destination element. If it's not loaded
		    // yet then wait for it to load (.then)
		    nextEntryPromise.then(function(entryElement) {
			log.writeFeedback("Preload of " + newEntry.path + " complete, transitioning");
			transitionContentsOf(resolvedOptions.element, entryElement)
			    .then(function(transitionResult) {
				log.writeFeedback("Transition complete");
				
				nextEntry.start();

				accept(transitionResult);
			    });
		    });
		}, minimumWaitTime * 1000);

	    // If preloading failed, don't bother processing
	    // the timeout event (will deadlock)
	    nextEntryPromise.catch(function(error) {
		log.writeFeedback("Preload of " + newEntry.path + " failed. Slide will remain as-is");
		clearTimeout(minimumWaitTimeout);
		reject(error);
	    });
	});

	return returnVal;
    }
    
    function iterateEntries(minimumWaitTime, entries, log) {
	if(entries.length === 0) {
	    log.writeFeedback("Entries supplied to iterateEntries empty, will not iterate any slides");
	    return;
	}

	var entryToShow = entries[0];
	var timeBeforeProgressionAttempt = Date.now();
	var progressEntry = progressToEntryAfter(minimumWaitTime, entryToShow, log);

	progressEntry.then(function() {
	    // We're now showing the new slide, which must
	    // be shown for the minimum wait time, so we're
	    // essentially going in a circle
	    log.writeFeedback(
		"Transition to new slide complete, scheduling the next " +
		    "slide");

	    if(stopped) {
		self.onStopped.trigger();
	    }
	    else {
		var nextSlidesToShow = rotateArray(entries);
		
		iterateEntries(entryToShow.duration, nextSlidesToShow, log);
	    }
	});

	progressEntry.catch(function(error) {
	    // Couldn't progress the entry for some reason
	    // (probably a load error), we're still showing
	    // the current entry and some time has passed,
	    // though, so we need to calculate how much time
	    // we have left to show the next one.

	    var timeAfterProgressionAttempt  = Date.now();
	    
	    var millisecondsConsumed =
		timeAfterProgressionAttempt - timeBeforeProgressionAttempt;
	    
	    var millisecondsRemaining =
		(minimumWaitTime * 1000) - millisecondsConsumed;
	    
	    var secondsRemaining = millisecondsRemaining / 1000;
	    
	    if(secondsRemaining < 0) secondsRemaining = 0;
	    
	    log.writeError(
		"Transition to slide failed. Skipping it and scheduling " +
		    "another slide to appear in " + secondsRemaining);
	    
	    if(stopped) {
		self.onStopped.trigger();
	    }
	    else {
		var nextSlidesToShow = rotateArray(entries);
		
		iterateEntries(secondsRemaining, nextSlidesToShow, log);
	    }
	});
    }

    this.onError = new Event();
    this.onFeedback = new Event();
    this.onStopped = new Event();

    this.onError.add(resolvedOptions.onError);
    this.onFeedback.add(resolvedOptions.onFeedback);

    var log = new Log();
    log.onErrorMessageReceived(this.onError.trigger);
    log.onFeedbackMessgeReceived(this.onFeedback.trigger);

    this.start = function() {
	stopped = false;
	self.onFeedback.trigger("Starting slideshow");
	iterateEntries(0, entries, log);
    };

    this.stop = function() {
	self.onFeedback.trigger("Stopping slideshow");

	return new Promise(function(resolve, reject) {
	    if(stopped)
		reject("Slideshow has already stopped");

	    stopped = true;

	    var onStoppedCallback = function() {
		self.onFeedback.trigger("Slideshow stopped");
		self.onStopped.remove(onStoppedCallback);
		resolve(self);
	    };

	    self.onStopped.add(onStoppedCallback);
	});
    };

    this.setEntries = function(newEntries) {
	return new Promise(function(resolve, reject) {
	    var stopPromise = self.stop();

	    stopPromise.then(function() {
		entries = newEntries;
		resolve(self.start());
	    });

	    stopPromise.catch(function(err) {
		reject(err);
	    });
	});
    };
}
