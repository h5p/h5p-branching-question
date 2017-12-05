H5P.BranchingQuestion = (function ($) {

  function BranchingQuestion(parameters, id) {
    var self = this;
    H5P.EventDispatcher.call(self);

    var createWrapper = function(parameters) {
      var wrapper = document.createElement('div');
      wrapper.className = 'h5p-branching-question';

      var title = document.createElement('h1');
      title.className = 'h5p-branching-question-title';
      title.innerHTML = parameters.question;

      wrapper.append(title);

      return wrapper;
    }

    var appendMultiChoiceSection = function(parameters, wrapper) {
      for (var i = 0; i < parameters.alternatives.length; i++) {
        var alternative = createAlternativeContainer(parameters.alternatives[i].text);
        alternative.nextContentId = parameters.alternatives[i].nextContentId;

        // Create feedback screen if it exists // TODO: check for undefined
        if (parameters.alternatives[i].addFeedback) {
          alternative.feedbackScreen = createFeedbackScreen(parameters.alternatives[i].feedback, alternative.nextContentId);
        }

        alternative.onclick = function() {
          if (this.feedbackScreen !== undefined) {
            wrapper.append(this.feedbackScreen);
          }
          else {
            self.trigger('navigated', this.nextContentId);
          }
        };

        wrapper.append(alternative);
      }

      return wrapper;
    }

    var createAlternativeContainer = function(text) {
      var wrapper = document.createElement('div');
      wrapper.classList.add('h5p-branching-question-alternative');

      var alternativeText = document.createElement('p');
      alternativeText.innerHTML = text;

      wrapper.append(alternativeText);

      return wrapper;
    }

    var createFeedbackScreen = function(feedback, nextContentId) {
      var wrapper = document.createElement('div');

      var title = document.createElement('p');
      title.innerHTML = feedback;
      wrapper.append(title);

      var navButton = document.createElement('button');
      navButton.onclick = function() {
        self.trigger('navigated', nextContentId);
      };

      var text = document.createTextNode('Proceed'); // TODO: use translatable
      navButton.append(text);

      wrapper.append(navButton);

      return wrapper;
    }

    self.attach = function ($container) {
      var wrapper = createWrapper(parameters);
      wrapper = appendMultiChoiceSection(parameters, wrapper);
      $container.append(wrapper);

    };
  }

  return BranchingQuestion;

})(H5P.jQuery, H5P.EventDispatcher);
