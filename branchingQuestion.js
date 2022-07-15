H5P.BranchingQuestion = (function () {

  function BranchingQuestion(parameters) {
    var self = this;
    self.firstFocusable;
    self.lastFocusable;
    H5P.EventDispatcher.call(self);
    this.container = null;
    let answered;
    let timestamp;

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
      const close = createCloseElement();

      wrapper.appendChild(icon);
      wrapper.appendChild(close);

      return wrapper;
    };

    /**
     * Create close element and register events
     *
     * @return {Element} close
     */
    const createCloseElement = function () {
      const close = document.createElement('div');
      close.classList.add('h5p-branching-question-close');
      close.tabIndex = 0;
      close.setAttribute('aria-label', H5P.t('close'));
      close.setAttribute('type', 'button');
      close.setAttribute('title', H5P.t('close'));

      close.addEventListener('keyup', function (event) {
        // Add support for space and enter
        if (event.code === 'Enter' || event.code === ' ') {
          closeDialog();
        }
      });

      close.onclick = function (e) {
        // Add clickevent
        closeDialog();
      };

      return close;
    };

    /**
     * Remove BQ and navigate back to its previous position
     */
    const closeDialog = function () {
      const overlay = self.parent.libraryScreen.overlay;
      if (overlay) {
        // TODO: When does this code every run?!
        overlay.remove();
        self.parent.libraryScreen.overlay = undefined;
        self.container.remove();
        self.parent.libraryScreen.showBackgroundToReadspeaker();
      }

      // Restart the BS if BQ is one first position
      if (self.parent.currentId === 0) {
        self.parent.trigger('restarted');
        return;
      }
      // Just navigate backward if BQ is not on first position
      self.parent.trigger('navigated', {
        reverse: true
      });
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
        const alternative = createAlternativeContainer(altParams.text, index);

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
            timestamp = new Date().toISOString();
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
                index2 = +alts[i].getAttribute('data-id');
                break;
              }
            }
            answered = index2;
            timestamp = new Date().toISOString();

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

      if (parameters.branchingQuestion.randomize && !questionWrapper.dataset.shuffled) {

        const alternatives = questionWrapper.querySelectorAll('button.h5p-branching-question-alternative');
        const shuffledAlternatives = H5P.shuffleArray(Array.from(alternatives));

        // Reorder the alternatives according to shuffledAlternatives
        shuffledAlternatives.forEach(function (alternative) {
          questionWrapper.appendChild(alternative);
        });

        // Prevent shuffling more than once
        questionWrapper.setAttribute('data-shuffled', true);
      }

      wrapper.appendChild(questionWrapper);
      return wrapper;
    };

    var createAlternativeContainer = function (text, id) {
      var wrapper = document.createElement('button');
      wrapper.classList.add('h5p-branching-question-alternative');
      wrapper.tabIndex = 0;
      wrapper.setAttribute('data-id', id);

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
      xAPIEvent.data.statement.timestamp = timestamp;
      return {
        statement: xAPIEvent.data.statement
      };
    };

    /**
     * If the chosen answer contains feedback data, adds an extension to the
     * provided extensions object, so that it can be included in reports.
     *
     * @param {object} extensions Existing object to use
     */
    var addFeedbackInfoExtension = function (extensions) {
      const alternatives = parameters.branchingQuestion.alternatives;
      const chosen = alternatives[answered];
      const feedback = chosen.feedback;

      if (!feedback.title && !feedback.subtitle && !feedback.image) {
        return; // Nothing to add
      }

      const converter = document.createElement('div');

      if (feedback.image) {
        feedback.imageUrl = H5P.getPath(
          feedback.image.path,
          self.parent.contentId
        );
      }

      if (feedback.title) {
        converter.innerHTML = feedback.title;
        feedback.title = converter.innerText.trim();
      }

      if (feedback.subtitle) {
        converter.innerHTML = feedback.subtitle;
        feedback.subtitle = converter.innerText.trim();
      }

      // Remove some properties to minimize size of JSON
      delete feedback.endScreenScore;
      delete feedback.image;

      const key = 'https://h5p.org/x-api/branching-choice-feedback';
      extensions[key] = feedback;
    };

    /**
     * Determine whether the Branching Scenario is using dynamic score.
     *
     * @return {boolean}
     */
    var contentIsUsingDynamicScore = function () {
      return (
        self.parent &&
        self.parent.params &&
        self.parent.params.scoringOptionGroup &&
        self.parent.params.scoringOptionGroup.scoringOption === 'dynamic-score'
      );
    };

    /**
     * If applicable, adds scoring and correctness information to the xAPI
     * statement for use in reports.
     *
     * @param {object} definition xAPI object definition
     * @param {array} alternatives Available branching choices
     */
    var addScoringAndCorrectness = function (definition, alternatives) {
      // Only include scoring and correctness data for dynamic score option
      if (!contentIsUsingDynamicScore()) {
        return;
      }

      // Track each possible score and the alternatives that award it
      const scoreMap = new Map();

      for (let i = 0; i < alternatives.length; i++) {
        const currentScore = alternatives[i].feedback.endScreenScore;

        if (typeof currentScore === 'number' && currentScore > 0) {
          if (scoreMap.has(currentScore)) {
            scoreMap.get(currentScore).push(i);
          }
          else {
            scoreMap.set(currentScore, [i]);
          }
        }
      }

      if (scoreMap.size > 0) {
        // All alternatives that give the max score are considered correct
        // See https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#correct-responses-pattern
        const maxScore = Math.max(...scoreMap.keys());
        definition.correctResponsesPattern = scoreMap.get(maxScore);

        // Use an extension in order to provide the points awarded by each alternative
        const extensionKey = 'https://h5p.org/x-api/alternatives-with-score';
        definition.extensions[extensionKey] = {};
        scoreMap.forEach((alternatives, score) => {
          alternatives.forEach(alternative => {
            definition.extensions[extensionKey][alternative] = score;
          });
        });

        // Remove extension that indicates there is no correct answer
        delete definition.extensions['https://h5p.org/x-api/no-correct-answer'];
      }
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

      addScoringAndCorrectness(definition, alternatives);
      if (answered) {
        addFeedbackInfoExtension(definition.extensions);
      }
    };

    /**
     * TODO
     */
    self.attach = function ($container) {
      var questionContainer = document.createElement('div');
      questionContainer.classList.add('h5p-branching-question-container');
      questionContainer.addEventListener('keyup', function (event) {
        if (event.code === 'Escape') {
          closeDialog();
        }
      });

      var branchingQuestion = createWrapper(parameters);
      branchingQuestion = appendMultiChoiceSection(parameters, branchingQuestion);
      trapFocus(branchingQuestion);

      questionContainer.appendChild(branchingQuestion);
      $container.append(questionContainer);
      this.container = $container[0];
    };
  }

  return BranchingQuestion;

})();
