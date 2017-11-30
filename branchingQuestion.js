H5P.BranchingQuestion = (function ($) {

  function BranchingQuestion(parameters, id) {
    var self = this;
    H5P.EventDispatcher.call(self);

    var wrapper = document.createElement('div');

    var title = document.createElement('p');
    title.innerHTML = parameters.question;
    wrapper.append(title);

    for (var i = 0; i < parameters.answers.length; i++) {
      var answer = document.createElement('ul');
      answer.innerHTML = parameters.answers[i].text;
      answer.nextContentId = parameters.answers[i].nextContentId;

      answer.onclick = function() {
        self.trigger('navigated', this.nextContentId);
      };
      wrapper.append(answer);
    }

    self.attach = function ($container) {
      $container.addClass('h5p-advanced-text').html(wrapper);
    };
  }

  return BranchingQuestion;

})(H5P.jQuery, H5P.EventDispatcher);
