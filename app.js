var presentation = angular.module('presentation', [ 'ui.keypress' ]);

presentation.factory('boundScopeHelper', function() {
  return function(directive) {
    var originalCompile = directive.compile;
    var originalLink = directive.link;

    directive.compile = function(tE, tA, transclude) {
      for (key in directive.scope) {
        tA[key] = key
      }

      if (!!originalCompile) {
        return originalCompile(tE, tA, transclude);
      } else if (!!originalLink) {
        return originalLink;
      } else {
        return function(scope, element, attrs) {};
      }
    };

    delete directive.link;

    return directive;
  };
});

presentation.factory('options', function() {
  return {
    slides: [],
    currentSlide: null,
    addSlide: function(id) {
      this.slides.push(id);
      this.currentSlide = this.currentSlide || id;
    },
    nextSlide: function() {
      var index = this.slides.indexOf(this.currentSlide);
      index += 1;
      if (index < this.slides.length) { this.switchToSlide(index) }
    },
    previousSlide: function() {
      var index = this.slides.indexOf(this.currentSlide);
      index -= 1;
      if (index > -1) { this.switchToSlide(index) }
    },
    switchToSlide: function(index) {
      this.currentSlide = this.slides[index];
    },
    hasPrevious: function() {
      var index = this.slides.indexOf(this.currentSlide);

      return index > 0;
    },
    hasNext: function() {
      var index = this.slides.indexOf(this.currentSlide);

      return index < this.slides.length - 1;
    },
  };
})

presentation.directive('presentation', function() {
  return {
    restrict: 'E',
    transclude: true,
    replace: true,
    templateUrl: 'presentation.html',
    controller: function($scope, options) {
      $scope.options = options;
      $scope.codeBlocks = ($scope.codeBlocks || {});
    },
  };
});

presentation.directive('slide', function(boundScopeHelper) {
  return boundScopeHelper({
    restrict: 'E',
    replace: true,
    transclude: true,
    scope: {
      'options': '=',
      'codeBlocks': '='
    },
    controller: function($scope) {
      $scope.state = ($scope.state || {});
      $scope.codeBlocks = ($scope.codeBlocks || {});
    },
    compile: function(tE, tA, transclude) {
      var id = tA.id;

      return function(scope, element, attrs) {
        scope.id = id;
        scope.options.addSlide(scope.id);
      }
    },
    templateUrl: 'slide.html'
  });
});

presentation.simpleDirective = function(name) {
  this.directive(name, function() {
    return {
      restrict: 'E',
      replace: true,
      transclude: true,
      scope: true,
      templateUrl: name + '.html',
      compile: function(tE, tA, transclude) {
        return function(scope, element, attrs) {
          transclude(scope, function(clone, innerScope) {
            clone = angular.element('<div />').append(clone);

            switch (name) {
              case 'title':
                scope[name] = clone.text();
                break;
              case 'subtitle':
                scope[name] = clone.html();
                break;
            }
          });
        };
      }
    };
  });
};

presentation.simpleDirective('title');
presentation.simpleDirective('subtitle');

presentation.directive('controls', function() {
  return {
    restrict: 'E',
    replace: true,
    templateUrl: 'controls.html'
  };
});

var codeGrabber = function(scope, element, name) {
  var html = element.html();

  scope.codeBlocks = scope.codeBlocks || {};
  scope.codeBlocks[name] = html;
};

presentation.directive('script', function() {
  return {
    restrict: 'E',
    link: function(scope, element, attrs) {
      if (attrs.type == 'text/code-grabber') {
        codeGrabber(scope, element, attrs.for);
      }
    }
  }
});

presentation.directive('codeGrabber', function() {
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
      codeGrabber(scope, element, attrs.codeGrabber);
    }
  };
});

presentation.directive('codeRunner', function($compile) {
  return {
    restrict: 'E',
    replace: true,
    link: function(scope, element, attrs) {
      element.after("<div class='code-runner' />")
      var target = element.next();
      element.remove()

      scope.$watch('codeBlocks', function(codeBlocks) {
        var content = angular.element("<div />").append(codeBlocks[attrs.for]);

        $compile(content)(scope);

        target.html('');
        target.append(content);
      }, true);
    }
  };
});

presentation.directive('codeDisplayer', function(boundScopeHelper) {
  return boundScopeHelper({
    restrict: 'E',
    replace: true,
    scope: {
      codeBlocks: '=',
      state: '='
    },
    templateUrl: 'code_displayer.html',
    link: function(scope, element, attrs) {
      scope.codeBlocks = scope.codeBlocks || {};

      scope.$watch('codeBlocks', function(codeBlocks) {
        if (codeBlocks && codeBlocks[attrs.for]) {
          var beautifier;

          switch (attrs.language) {
            case 'html':
              beautifier = window.html_beautify;
              break;
            case 'javascript':
              beautifier = window.js_beautify;
              break;
          }

          Rainbow.color(beautifier(codeBlocks[attrs.for], { indent_size: 2 }), attrs.language, function(highlightedCode) {
            element.find('code').append(highlightedCode);
          });
        }
      }, true);
    }
  });
});

