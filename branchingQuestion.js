H5P.BranchingQuestion = (function ($) {

  function BranchingQuestion(parameters) {
    console.log(parameters);
    var self = this;
    self.firstFocusable;
    self.lastFocusable;
    H5P.EventDispatcher.call(self);
    this.container = null;
    let answered;
    this.initialTime = parameters.behaviour;
    this.timeRemaining = this.initialTime;
    this.started = false;

    /**
     * Get closest ancestor of DOM element that matches selector.
     *
     * Mimics Element.closest(), workaround for IE11.
     *
     * @param {Element} element DOM element.
     * @param {string} selector CSS selector.
     * @return {Element|null} Element, if found. Else null.
     */
    const getClosestParent = function (element, selector) {
      if (!document.documentElement.contains(element)) {
        return null;
      }
      if (!Element.prototype.matches) {
        Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
      }

      do {
        if (element.matches(selector)) {
          return element;
        }
        element = element.parentElement || element.parentNode;
      }
      while (element !== null && element.nodeType === 1);
      return null;
    };

    var createWrapper = function () {
      var wrapper = document.createElement('div');
      wrapper.classList.add('h5p-branching-question');

      var icon = document.createElement('img');
      icon.classList.add('h5p-branching-question-icon');
      icon.src = self.getLibraryFilePath('branching-question-icon.svg');

      wrapper.appendChild(icon);

      return wrapper;
    };

    var appendTimer = (wrapper) => {
      console.log(parameters.behaviour);
      var timerWrapper = document.createElement('div');
      timerWrapper.classList.add('h5p-timer-wrapper');

      var canvas = document.createElement('canvas');
      canvas.classList.add('h5p-timer-canvas');
      updateCanvas(canvas, this.timeRemaining, this.initialTime);

      timerWrapper.append(canvas);
      wrapper.appendChild(timerWrapper);

      return wrapper;
    }

    var appendMultiChoiceSection = function (parameters, wrapper) {
      var questionWrapper = document.createElement('div');
      questionWrapper.classList.add('h5p-multichoice-wrapper');

      var title = document.createElement('div');
      title.classList.add('h5p-branching-question-title');
      title.innerHTML = parameters.branchingQuestion.question;

      questionWrapper.appendChild(title);

      const alternatives = parameters.branchingQuestion.alternatives || [] ;
      alternatives.forEach(function (altParams, index, array) {
        const alternative = createAlternativeContainer(altParams.text);

        if (index === 0) {
          self.firstFocusable = alternative;
        }

        if (index === array.length - 1) {
          self.lastFocusable = alternative;
        }

        alternative.nextContentId = altParams.nextContentId;

        // Create feedback screen if it exists
        const hasFeedback = altParams.feedback && !!(
          altParams.feedback.title && altParams.feedback.title.trim() ||
          altParams.feedback.subtitle && altParams.feedback.subtitle.trim() ||
          altParams.feedback.image
        );
        if (hasFeedback && altParams.nextContentId !== -1) {
          alternative.feedbackScreen = createFeedbackScreen(
            altParams.feedback,
            alternative.nextContentId,
            index
          );
          alternative.proceedButton = alternative.feedbackScreen.querySelectorAll('button')[0];
        }
        alternative.hasFeedback = altParams.feedback && !!(hasFeedback || altParams.feedback.endScreenScore !== undefined);
        alternative.feedback = altParams.feedback;

        alternative.addEventListener('keyup', function (event) {
          if (event.which === 13 || event.which === 32) {
            this.click();
          }
        });

        alternative.onclick = function (e) {
          if (this.feedbackScreen !== undefined) {
            if (self.container) {
              self.container.classList.add('h5p-branching-scenario-feedback-dialog');
            }
            wrapper.innerHTML = '';
            wrapper.appendChild(this.feedbackScreen);
            answered = index;
            this.proceedButton.focus();
            self.triggerXAPI('interacted');
          }
          else {

            var currentAlt = e.target.classList.contains('.h5p-branching-question-alternative') ?
              e.target : getClosestParent(e.target, '.h5p-branching-question-alternative');
            var alts = questionWrapper.querySelectorAll('.h5p-branching-question-alternative');
            var index2;
            for (var i = 0; i < alts.length; i++) {
              if (alts[i] === currentAlt) {
                index2 = i;
                break;
              }
            }
            answered = index2;

            var nextScreen = {
              nextContentId: this.nextContentId,
              chosenAlternative: index2,
            };

            const currentAltParams = parameters.branchingQuestion.alternatives[index2];
            const currentAltHasFeedback = !!(currentAltParams.feedback.title
              || currentAltParams.feedback.subtitle
              || currentAltParams.feedback.image
              || currentAltParams.feedback.endScreenScore !== undefined
            );

            if (index2 >= 0 && currentAltHasFeedback) {
              nextScreen.feedback = currentAltParams.feedback;
            }
            self.trigger('navigated', nextScreen);
          }
        };
        questionWrapper.appendChild(alternative);
      });

      // Add alternative to go back
      const currentId = self.parent.getUserPath().slice(-1)[0] || -1;
      if (currentId >= 0 && self.parent.canEnableBackButton(currentId) === true && self.parent.getUserPath().length > 1) {
        const alternativeBack = self.createAlternativeBackContainer(self.parent.params.l10n.backButtonText);
        questionWrapper.appendChild(alternativeBack);
      }

      wrapper.appendChild(questionWrapper);
      return wrapper;
    };

    var createAlternativeContainer = function (text) {
      var wrapper = document.createElement('div');
      wrapper.classList.add('h5p-branching-question-alternative');
      wrapper.tabIndex = 0;

      var alternativeText = document.createElement('p');
      alternativeText.innerHTML = text;

      wrapper.appendChild(alternativeText);
      return wrapper;
    };

    var createFeedbackScreen = function (feedback, nextContentId, chosenAlternativeIndex) {

      var wrapper = document.createElement('div');
      wrapper.classList.add('h5p-branching-question');
      wrapper.classList.add(feedback.image !== undefined ? 'h5p-feedback-has-image' : 'h5p-feedback-default');

      if (feedback.image !== undefined && feedback.image.path !== undefined) {
        var imageContainer = document.createElement('div');
        imageContainer.classList.add('h5p-branching-question');
        imageContainer.classList.add('h5p-feedback-image');
        var image = document.createElement('img');
        image.src = H5P.getPath(feedback.image.path, self.contentId);
        imageContainer.appendChild(image);
        wrapper.appendChild(imageContainer);
      }

      var feedbackContent = document.createElement('div');
      feedbackContent.classList.add('h5p-branching-question');
      feedbackContent.classList.add('h5p-feedback-content');

      var feedbackText = document.createElement('div');
      feedbackText.classList.add('h5p-feedback-content-content');
      feedbackContent.appendChild(feedbackText);

      var title = document.createElement('h1');
      title.innerHTML = feedback.title || '';
      feedbackText.appendChild(title);

      if (feedback.subtitle) {
        var subtitle = document.createElement('div');
        subtitle.innerHTML = feedback.subtitle || '';
        feedbackText.appendChild(subtitle);
      }

      var navButton = document.createElement('button');
      navButton.onclick = function () {
        self.trigger('navigated', {
          nextContentId: nextContentId,
          chosenAlternative: chosenAlternativeIndex
        });
      };

      var text = document.createTextNode(parameters.proceedButtonText);
      navButton.appendChild(text);

      feedbackContent.appendChild(navButton);

      var KEYCODE_TAB = 9;
      feedbackContent.addEventListener('keydown', function (e) {
        var isTabPressed = (e.key === 'Tab' || e.keyCode === KEYCODE_TAB);
        if (isTabPressed) {
          e.preventDefault();
          return;
        }
      });

      wrapper.appendChild(feedbackContent);

      return wrapper;
    };

    //https://hiddedevries.nl/en/blog/2017-01-29-using-javascript-to-trap-focus-in-an-element
    var trapFocus = function (element) {
      var KEYCODE_TAB = 9;
      element.addEventListener('keydown', function (e) {
        var isTabPressed = (e.key === 'Tab' || e.keyCode === KEYCODE_TAB);

        if (!isTabPressed) {
          return;
        }

        if (e.shiftKey && document.activeElement === self.firstFocusable) /* shift + tab */ {
          self.lastFocusable.focus();
          e.preventDefault();
        }
        else if (document.activeElement === self.lastFocusable) { /* tab */
          self.firstFocusable.focus();
          e.preventDefault();
        }
      });
    };

    /**
     * Create alternative container for going back.
     * @param {string} text Text for the container.
     * @param {HTMLElement} Alternative container.
     */
    self.createAlternativeBackContainer = function (text) {
      const self = this;

      const alternativeBack = createAlternativeContainer(text);
      alternativeBack.classList.add('h5p-branching-question-alternative-back');

      alternativeBack.addEventListener('click', function () {
        self.trigger('navigated', {
          reverse: true
        });
      });

      return alternativeBack;
    };

    /**
     * Get xAPI data.
     * Contract used by report rendering engine.
     *
     * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-6}
     */
    self.getXAPIData = function () {
      var xAPIEvent = this.createXAPIEventTemplate('answered');
      addQuestionToXAPI(xAPIEvent);
      xAPIEvent.setScoredResult(undefined, undefined, self, true);
      xAPIEvent.data.statement.result.response = answered;
      return {
        statement: xAPIEvent.data.statement
      };
    };

    /**
     * Add the question to the given xAPIEvent
     *
     * @param {H5P.XAPIEvent} xAPIEvent
     */
    var addQuestionToXAPI = function (xAPIEvent) {
      const converter = document.createElement('div');

      var definition = xAPIEvent.getVerifiedStatementValue(['object', 'definition']);
      converter.innerHTML = parameters.branchingQuestion.question;
      definition.description = {
        'en-US': converter.innerText
      };
      definition.type = 'http://adlnet.gov/expapi/activities/cmi.interaction';
      definition.interactionType = 'choice';
      definition.correctResponsesPattern = [];
      definition.choices = [];
      definition.extensions = {
        'https://h5p.org/x-api/no-correct-answer': 1
      };

      const alternatives = parameters.branchingQuestion.alternatives;
      for (let i = 0; i < alternatives.length; i++) {
        converter.innerHTML = alternatives[i].text;
        definition.choices[i] = {
          'id': i + '',
          'description': {
            'en-US': converter.innerText
          }
        };
      }
    };

    /**
     * TODO
     */
    const updateCanvas = function(canvas, initialTime, timeRemaining) {
      const totalLength = (2 * Math.PI) * 0.75;
      const percentComplete = 1 - timeRemaining / initialTime;
      const context = canvas.getContext('2d');
      context.clearRect(0, 0, canvas.width, canvas.height);
      // context.width = 400;
      // context.height = 400;
      context.save();
      context.fillStyle = 'black';
      context.font = "15px monaco";
      context.textAlign = "center";
      context.fillText(`${Math.ceil(timeRemaining)}s`, 150, 75);
      context.translate(150, 75);
      context.rotate(Math.PI * 0.75);
      context.translate(-150, -75);
      context.strokeStyle = "green";
      context.beginPath();
      context.arc(150, 75, 50, totalLength * percentComplete, totalLength);
      context.lineWidth = 50;
      context.stroke();
      context.strokeStyle = "gray";
      context.beginPath();
      context.arc(150, 75, 50, 0, totalLength * percentComplete);
      context.stroke();
      context.restore();
      // context.rotate(-Math.PI * 0.75);
    }

    self.on("domChanged", (e) => {
      if (e.data.$target[0].className === "h5p-branching-question-wrapper" && !this.started) {
        this.started = true;
        const timerInterval = setInterval(() => {
          const canvas = document.querySelector('canvas');
          updateCanvas(canvas, this.initialTime, parseFloat(this.timeRemaining.toFixed(1)));
          console.log(this.timeRemaining.toFixed(1));
          if (this.timeRemaining.toFixed(1) === "0.0") clearInterval(timerInterval);
          this.timeRemaining -= .1;
        }, 100);
      }
    });

    self.attach = function ($container) {
      // Disable back button of underlying library screen
      self.parent.disableBackButton();

      var questionContainer = document.createElement('div');
      questionContainer.classList.add('h5p-branching-question-container');

      var branchingQuestion = createWrapper(parameters);
      branchingQuestion = appendMultiChoiceSection(parameters, branchingQuestion);
      trapFocus(branchingQuestion);

      var timer = createWrapper(parameters);
      timer = appendTimer(timer);

      questionContainer.appendChild(branchingQuestion);
      questionContainer.appendChild(timer);
      $container.append(questionContainer);
      this.container = $container[0];
    };
  }

  return BranchingQuestion;

})(H5P.jQuery);
// H5P.jquery
