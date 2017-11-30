H5P.BranchingQuestion = (function ($) {

  function BranchingQuestion(parameters, id) {
    var self = this;
    H5P.EventDispatcher.call(self);

    var createWrapper = function(parameters) {
      var wrapper = document.createElement('div');

      var title = document.createElement('p');
      title.innerHTML = parameters.question;
      wrapper.append(title);

      return wrapper;
    }

    var appendMultiChoiceSection = function(parameters, wrapper) {
      for (var i = 0; i < parameters.answers.length; i++) {

        var answer = document.createElement('ul');
        answer.innerHTML = parameters.answers[i].text;
        answer.nextContentId = parameters.answers[i].nextContentId;

        // Create feedback screens if they exist // TODO: check for undefined
        if (parameters.answers[i].addFeedback) {
          answer.feedbackScreen = createFeedbackScreen(parameters.answers[i].feedback, answer.nextContentId);
        }

        answer.onclick = function() {
          if (this.feedbackScreen !== undefined) {
            wrapper.append(this.feedbackScreen);
          }
          else {
            self.trigger('navigated', this.nextContentId);
          }
        };

        wrapper.append(answer);
      }

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
      $container.addClass('h5p-advanced-text').html(wrapper);
    };
  }

  return BranchingQuestion;

})(H5P.jQuery, H5P.EventDispatcher);
