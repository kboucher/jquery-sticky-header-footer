/*
 *  jquery-sticky-header-footer - v1.2.11
 *  jQuery plugin that dynamically sticks content headers and footers to the top and bottom of viewport.
 *  https://github.com/kboucher
 *
 *  Made by Kevin Boucher
 *  Under MIT License
 */
/**
 *  jquery-sticky-header-footer
 *  Lightweight jQuery plugin providing sticky header and footer functionality for tables and lists.
 *
 *  @module     jquery-sticky-header-footer
 *  @extends    jQuery
 *
 *  @example
 *      // Configuration object is optional if setting up a table
 *      // with a sticky header and sticky footer.
 *      $(<your-list-container>).stickyHeaderFooter({
 *          // these are in the context of <your-list-container>
 *          bodySelector: '<body-selector>',       // {String} default is 'tbody'
 *          footerSelector: '<footer-selector>',   // {String} default is 'tfoot'
 *          headerSelector: '<header-selector>'    // {String} default is 'thead',
 *          top: '<number><units>',                // {String} (CSS value) default is '0'
 *          bottom: '<number><units>'              // {String} (CSS value) default is '0'
 *      });
 *
 *  @author     Kevin Boucher
 *  @license    Dual licensed under MIT and GNU GPL
 */
;(function($, window, document, undefined) {
    'use strict';

    // Defaults and constants
    var pluginName = 'stickyHeaderFooter',
        defaults = {
            bodySelector: 'tbody',
            footerSelector: 'tfoot',
            headerSelector: 'thead',
            top: '0',
            bottom: '0',
            zIndex: 10
        },
        classNames = {
            innerWrapper: 'sticky-header-footer_sticky-wrapper',
            innerWrapperHead: 'sticky-header-footer_sticky-header',
            innerWrapperFoot: 'sticky-header-footer_sticky-footer',
            outerWrapper: 'sticky-header-footer_wrapper',
            originalFooter: 'sticky-header-footer_original-footer',
            originalHeader: 'sticky-header-footer_original-header'
        },
        methods = {

            /**
                Handle any required tear down.
                 - Remove scroll event handlers

                @method tearDown
             */
            tearDown: function() {
                var $this = $(this);
                var $instance = $this.data()['plugin_' + pluginName];
                var $element = $this;

                if(!$instance) {
                    return;
                }

                window.removeEventListener('scroll', $instance._scrollHandler);
                window.removeEventListener('resize', $instance._resizeHandlerHandler);
                window.removeEventListener('orientationchange', $instance._orientationHandler);

                /**
                 *  Fix for Chrome rendering bug (see above)
                 */
                window.removeEventListener('scroll', $instance._scrollStopHandler);

                /**
                    Remove added DOM elements and plugin data
                 */
                $.each([$instance.footerElement, $instance.headerElement], function(idx, element) {
                    if (element) {
                        if (element.isStuck) {
                            $instance.unstick.call($instance, element);
                        }
                        $(element.stickyClone).remove();
                    }
                });
                $element.closest('.' + classNames.outerWrapper).before($element[0]).remove();
                $element.removeData('plugin_' + pluginName);
            }
        },
        swapNodes = function(a, b) {
            var aParent = a.parentNode;
            var aSibling = a.nextSibling === b ? a : a.nextSibling;
            b.parentNode.insertBefore(a, b);
            aParent.insertBefore(b, aSibling);
        },
        throttle = function(fn, threshhold, scope) {
            threshhold || (threshhold = 250);

            var last, deferTimer;

            return function() {
                var context = scope || this,
                    now = +new Date(),
                    args = arguments;

                if (last && now < last + threshhold) {
                    // hold on to it
                    clearTimeout(deferTimer);
                    deferTimer = setTimeout(function() {
                        last = now;
                        fn.apply(context, args);
                    }, threshhold);
                } else {
                    last = now;
                    fn.apply(context, args);
                }
            };
        },
        debounce = function(fn, delay) {
            var timer = null;

            return function() {
                var context = this,
                    args = arguments;
                clearTimeout(timer);
                timer = setTimeout(function() {
                    fn.apply(context, args);
                }, delay);
            };
        };

    // StickyHeaderFooter constructor
    function StickyHeaderFooter(element, options) {
        this.element = element;
        this.settings = $.extend({}, defaults, options);

        this.bodyElement = $(this.settings.bodySelector, this.element)[0];
        this.footerElement = $(this.settings.footerSelector, this.element)[0];
        this.headerElement = $(this.settings.headerSelector, this.element)[0];

        this.isTable = this.element.tagName.toLowerCase() === 'table';
        this.isVisible = function() {
            var elmRect = this.element.getBoundingClientRect();
            return elmRect.top < window.innerHeight && elmRect.bottom > 0;
        };

        this._defaults = defaults;
        this._name = pluginName;
        this._scrollHandler = null;
        this._resizeHandler = null;
        this._orientationHandler = null;
        this._width = null;

        this.init();
    }

    $.extend(StickyHeaderFooter.prototype, {

        /**
         *  Initializes DOM and sets event listeners.
         *
         *  @method init
         */
        init: function() {
            var throttleRate = 66;

            // Add DOM wrapper to provide known reference point
            $(this.element).wrap('<div class="' + classNames.outerWrapper + '"></div>');

            if (this.footerElement || this.headerElement) {

                // Clone, wrap, decorate and store references to header/footer.
                if (this.footerElement) {
                    this.setupHeaderFooter(true);
                    this.footerElement.isFooter = true;
                }

                if (this.headerElement) {
                    this.setupHeaderFooter();
                }

                /**
                 *   1. Store and add scroll event listener
                 *      (Storing before assigning seems to uncover a Chrome repaint/redraw bug.)
                 *   2. Trigger scroll event (initialize sticky header/footer positions)
                 */
                document.addEventListener(
                    'scroll',
                    this._scrollHandler = throttle(this.watchHeaderFooter.bind(this), throttleRate)
                );

                /**
                 *  Fix for Chrome rendering bug (force repaint)
                 *
                 *  Sometimes in Chrome it is possible to have the sticky header still stuck to
                 *  the top of the viewport even though the real header is well below it in the screen.
                 *
                 *  The obvious assumption is that there is an issue with the throttling that is causing
                 *  that element not to be hidden when the real header scrolls back into view. However,
                 *  inspecting the element will show that the CSS is in fact updated (has display:none).
                 *
                 *  The following code is a workaround for this Chrome issue and essentially forces a
                 *  repaint when scrolling has stopped. (includes a line in tearDown())
                 */
                document.addEventListener(
                    'scroll',
                    this._scrollStopHandler = debounce(function() {
                        $('.'.concat(classNames.innerWrapper)).css('transform', 'translateZ(0)');
                    }, throttleRate)
                );

                /**
                 *  Resizes sticky elements as needed on resize or orientation change.
                 *
                 */
                window.addEventListener(
                    'resize',
                    this._resizeHandler = throttle(this.watchParentWidth.bind(this), throttleRate)
                );
                window.addEventListener(
                    'orientationchange',
                    this._orientationHandler = this.watchParentWidth.bind(this)
                );

                /**
                 *  Trigger scroll event to initialize sticky header/footer positions.
                 *
                 *  - Wrapped in try block to overcome bug in IE
                 */
                try {
                    document.dispatchEvent(new Event('scroll'));
                } catch (e) {}
            }
        },

        /**
         *  Decorates DOM elements to support sticky functionality.
         *
         *  @method setupHeaderFooter
         *  @param {Boolean} Is this a sticky footer?
         */
        setupHeaderFooter: function(isFooter) {
            var insertAction = isFooter ? 'insertAfter' : 'insertBefore',
                element = isFooter ? 'footerElement' : 'headerElement',
                colgroup = $(this.element).find('colgroup:first'),
                originalClassName = isFooter ?
                    classNames.originalFooter :
                    classNames.originalHeader,
                wrapperClasses = [
                    classNames.innerWrapper,
                    isFooter ? classNames.innerWrapperFoot : classNames.innerWrapperHead
                ];

            /**
                1. Create and store header/footer clone
                2. Wrap with sticky-header-footer DIV
                3. Conditionally wrap with TABLE (THEAD/TFOOT only)
                5. Hide clone
                6. Append to DOM
             */
            this[element].stickyClone = $(this[element]).clone(false)
                .wrap(
                    $('<div></div>').css({
                        bottom: isFooter ? this.settings.bottom : 'auto',
                        position: 'fixed',
                        top: !isFooter ? this.settings.top : 'auto',
                        'z-index': this.settings.zIndex,
                    }).addClass(wrapperClasses.join(' '))
                )
                .wrap(function() {
                    var classNames = this.element.getAttribute('class');
                    if (this.isTable) {
                        return $('<table></table>').addClass(classNames);
                    }
                    return '';
                }.bind(this)).parents('.' + classNames.innerWrapper)
                .css('display', 'none')[insertAction](this.element)[0];

            /**
                Decorate original header and footer elements to
                differentiate them from clones at runtime.
             */
            $(this[element]).addClass(originalClassName);

            /**
                Support use of colgroup to maintain cell sizes on cloned and
                fixed header/footer elements.

                * Valid with tables only
             */
            if (colgroup) {
                colgroup.clone(false).appendTo($(this[element].stickyClone).find('table'));
            }
        },

        /**
         *  Swaps clone and source elements and displays clone container.
         *  Also sets width to overcome deficiency when element is
         *  instantiated in a non-visible state.
         *  ("0px" width is applied in setupHeaderFooter().)
         *
         *  @method stick
         *  @param {HTMLElement} The header or footer item to be stuck.
         */
        stick: function(elem) {
            var settings = this.settings,
                selector = elem.isFooter ? settings.footerSelector : settings.headerSelector,
                width = $(elem).parents('.'.concat(classNames.outerWrapper + ':first')).width();

            swapNodes(
                elem,
                elem.stickyClone.querySelector(selector)
            );

            // Store current width
            this._width = width;

            // Set element state and sticky styles
            elem.isStuck = true;
            elem.stickyClone.style.display = 'block';
            elem.stickyClone.style.width = width + 'px';
        },

        /**
         *  Swaps clone and source back to original location and hides clone container.
         *
         *  @method unstick
         *  @param {HTMLElement} The header or footer item to be unstuck.
         */
        unstick: function(elem) {
            var settings = this.settings,
                selector = elem.isFooter ? settings.footerSelector : settings.headerSelector;

            swapNodes(
                elem,
                this.element.querySelector(selector)
            );

            elem.isStuck = false;
            elem.stickyClone.style.display = 'none';
        },

        /**
         *  If sticky footer is enabled, this method will be called
         *  on scroll to make any required updates to the footer.
         *
         *  @method watchFooter
         *  @param {HTMLElement} The sticky footer item to be processed.
         */
        watchFooter: function(footer) {
            var bodyRect = this.bodyElement.getBoundingClientRect(),
                footAdjust = parseInt(this.settings.bottom, 10),
                footRect = footer.getBoundingClientRect(),
                viewHeight = window.innerHeight;

            if (footer.isStuck) {

                /**
                    Unstick this sticky-header-footer's footer element if:
                        1. Footer has moved above bottom of viewport, OR ...
                        2. Header has scrolled to the footer, OR ...
                        3. Sticky Header Footer element is no longer visible in the viewport
                 */
                if (bodyRect.bottom < viewHeight - footAdjust - footRect.height ||
                    bodyRect.top > viewHeight - footAdjust ||
                    !this.isVisible()) {
                    this.unstick.call(this, footer);
                }
            } else {

                /**
                    Stick this sticky-header-footer's footer element if:
                        1. Footer element is below bottom of the viewport, AND ...
                        2. Header is above sticky footer, AND ...
                        3. Sticky Header Footer element is visible in the viewport
                 */
                if (bodyRect.bottom > viewHeight - footAdjust - footRect.height &&
                    bodyRect.top < viewHeight - footAdjust &&
                    this.isVisible()) {
                    this.stick.call(this, footer);
                }
            }
        },

        /**
         *  If sticky footer is enabled, this method will be called
         *  on scroll to make any required updates to the footer.
         *
         *  @method watchHeader
         *  @param {HTMLElement} The sticky header item to be processed.
         */
        watchHeader: function(header) {
            var bodyRect = this.bodyElement.getBoundingClientRect(),
                headAdjust = parseInt(this.settings.top, 10),
                headRect = header.getBoundingClientRect();

            if (header.isStuck) {

                /**
                    Unstick this sticky-header-footer's header element if:
                        1. Top of the header is below the top of the sticky header, OR ...
                        2. Footer is under the sticky header
                 */
                if (bodyRect.top > headAdjust + headRect.height ||
                    bodyRect.bottom < headAdjust + headRect.height / 2) {
                    this.unstick.call(this, header);
                }
            } else {

                /**
                    Stick this sticky-header-footer's header element if:
                        1. Top of the header is at the top of the viewport (or custom position), AND ...
                        2. Footer is below the bottom of the potential sticky header
                 */
                if (bodyRect.top <= headAdjust + headRect.height &&
                    bodyRect.bottom > headAdjust + headRect.height) {
                    this.stick.call(this, header);
                }
            }
        },

        /**
         *  Delegates scroll event handling to specific header
         *  and footer DOM manipulation methods.
         *
         *  @method watchHeaderFooter
         */
        watchHeaderFooter: function(/* event */) {
            if (!!this.footerElement) {
                this.watchFooter(this.footerElement);
            }

            if (!!this.headerElement) {
                this.watchHeader(this.headerElement);
            }
        },

        /**
            Adjusts sticky elements' widths when container width changes.

            @method watchParentWidth
         */
        watchParentWidth: function(/* event */) {
            var width = $(this.element)
                    .parents('.' + classNames.outerWrapper + ':first')
                    .width();

            if (this._width && this._width !== width) {
                if (!!this.footerElement) {
                    this.footerElement.stickyClone.style.width = width + 'px';
                }

                if (!!this.headerElement) {
                    this.headerElement.stickyClone.style.width = width + 'px';
                }
            }
        },

        /**
            Call `methods.tearDown()`

            Maintains backwards compatitibility after exposing
            tearDown() as a method.

            @method tearDown
         */
        tearDown: function() {
            methods.tearDown.call(this);
        }
    });

    /**
        Lightweight wrapper around the constructor,
        preventing multiple instantiations.
    */
    $.fn[pluginName] = function(methodOrOptions) {
        if (methods[methodOrOptions]) {
            return methods[methodOrOptions].apply(this, Array.prototype.slice.call(arguments, 1));
        } else {
            return this.each(function() {
                if (!$.data(this, 'plugin_' + pluginName)) {
                    $.data(this, 'plugin_' + pluginName, new StickyHeaderFooter(this, methodOrOptions));
                }
            });
        }
    };

})(jQuery, window, document);
