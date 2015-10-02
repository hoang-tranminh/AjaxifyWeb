// Ajaxify
// v1.0.1 - 30 September, 2012
// https://github.com/browserstate/ajaxify
(function(window,undefined){
	
	// Prepare our Variables
	var
		History = window.History,
		$ = window.jQuery,
		document = window.document;

	// Check to see if History.js is enabled for our Browser
	if ( !History.enabled ) {
		return false;
	}

	// Wait for Document
	$(function(){
		// Prepare Variables
	    var
			/* Application Specific Variables */
			contentSelector = '#content,article:first,.article:first,.post:first',
			$content = $(contentSelector).filter(':first'),
			contentNode = $content.get(0),
			$menu = $('#menu,#nav,nav:first,.nav:first').filter(':first'),
			activeClass = 'active selected current youarehere',
			activeSelector = '.active,.selected,.current,.youarehere',
			menuChildrenSelector = '> li,> ul > li',
			completedEventName = 'statechangecomplete',
			/* Application Generic Variables */
			$window = $(window),
			$body = $(document.body),
			rootUrl = History.getRootUrl(),
			scrollOptions = {
			    duration: 800,
			    easing: 'swing'
			},
            scriptsToReExecRegx = /<!--ajaxfy-script-->\s*<script.*?>(.|\s)*?<\/script>/;
		
		// Ensure Content
		if ( $content.length === 0 ) {
			$content = $body;
		}
		
		// Internal Helper
		$.expr[':'].internal = function(obj, index, meta, stack){
			// Prepare
			var
				$this = $(obj),
				url = $this.attr('href')||'',
				isInternalLink;
			
			// Check link
			isInternalLink = url.substring(0,rootUrl.length) === rootUrl || url.indexOf(':') === -1;
			
			// Ignore or Keep
			return isInternalLink;
		};
		
		// HTML Helper
		var documentHtml = function(html){
			// Prepare
			var result = String(html)
				.replace(/<\!DOCTYPE[^>]*>/i, '')
				.replace(/<(html|head|body|title|meta|script)([\s\>])/gi,'<div class="document-$1"$2')
				.replace(/<\/(html|head|body|title|meta|script)\>/gi, '</div>')
                .replace(/<!--\s*ajaxify-script\s*-->/gi, '<span class="ajaxify-script"/>')
			    .replace(/^\s+|\s+$/g, '') //remove the new line at start and end of html
			;
			
			// Return
			return $.trim(result);
		};
		
        //function to load scripts in correct execution order
		var scriptLoader = function ($scripts) {

		    //==============Add the scripts back to the document, keeping execution order =============
		    // scriptTree is a list of script elements (script blocks or external scripts).
		    // For script blocks they are always executed according to order they are appended to the document.
		    // For external scripts, they are executed according to order they are appended if they have async=false.
		    // If we want some script blocks to execute after an external script, we add those blocks to a child array of
		    // an external script, and wait after the external script "onload", then appending the blocks.
		    var scriptTree = [],
                preScriptIsExternal;

		    $scripts.each(function () {
		        var $script = $(this), scriptText = $script.text(), scriptNode = document.createElement('script');

		        if ($script.attr('src')) {
		            //external script, add src attr to new script element defined above
		            scriptNode.src = $script.attr('src');

		            //if external script doesn't have async attribute, has to set this attr specifically to false
		            //to preserve the execution order, same with order we append the external scripts to
		            //document object later
		            if (!$script.attr('async')) {
		                scriptNode.async = false;
		            }
		            else {
		                scriptNode.async = true;
		            }
		        } else {
		            //a script block, add the content to the new script element
		            scriptNode.appendChild(document.createTextNode(scriptText));
		        }

		        if (!preScriptIsExternal || scriptNode.src) {
		            //If the previous script is NOT an external script then add current script (external or block) directly to the tree.
		            //If the previous script is an external script, current script must be an external script to add it directly to the tree.
		            scriptTree.push({ node: scriptNode, hasSrc: !!scriptNode.src });
		        } else {
		            //If the previous script is external and current script is block, then add the block to child array of previous script
		            scriptTree[scriptTree.length - 1].inlines = scriptTree[scriptTree.length - 1].inlines || [];
		            scriptTree[scriptTree.length - 1].inlines.push(scriptNode);
		        }
		        if (scriptNode.src) {
		            preScriptIsExternal = true;
		        }
		    });

		    $(scriptTree).each(function (index, value) {
		        if (!value.hasSrc) {
		            contentNode.appendChild(value.node);
		        } else {
		            if (value.inlines) {
		                var childScripts = value.inlines;
		                value.node.onload = function () {
		                    $(childScripts).each(function (i, v) {
		                        contentNode.appendChild(v);
		                    });
		                }
		            };
		            contentNode.appendChild(value.node);
		        }
		    });
		};

		// Ajaxify Helper
		$.fn.ajaxify = function(){
			// Prepare
			var $this = $(this);
			
			// Ajaxify
			$this.find('a:internal:not(.no-ajaxy)').click(function(event){
				// Prepare
				var
					$this = $(this),
					url = $this.attr('href'),
					title = $this.attr('title')||null;
				
				// Continue as normal for cmd clicks etc
				if ( event.which == 2 || event.metaKey ) { return true; }
				
				// Ajaxify this link
				History.pushState(null,title,url);
				event.preventDefault();
				return false;
			});
			
			// Chain
			return $this;
		};
		
		// Ajaxify our Internal Links
		$body.ajaxify();
		
		// Hook into State Changes
		$window.bind('statechange',function(){
			// Prepare Variables
			var
				State = History.getState(),
				url = State.url,
				relativeUrl = url.replace(rootUrl,'');

			// Set Loading
			$body.addClass('loading');

			// Start Fade Out
			// Animating to opacity to 0 still keeps the element's height intact
			// Which prevents that annoying pop bang issue when loading in new content
			$content.animate({opacity:0},800);
			
			// Ajax Request the Traditional Page
			$.ajax({
				url: url,
				success: function(data, textStatus, jqXHR){
					// Prepare
					var
						$data = $(documentHtml(data)),
						$dataBody = $data.find('.document-body:first'),
						$dataContent = $dataBody.find(contentSelector).filter(':first'),
						$menuChildren, contentHtml, $scripts;
					
				    // $allScripts is an array of all scripts that need to be re-executed after new content
				    // is replaced, but first find all the scripts in raw new HTML from server that is marked with 
				    // <!--ajaxify-script--> comment, but we have replaced <!--ajaxify-script--> with <span class="ajaxify-script"/> for easy searching
					var $allScripts = $data.find('span.ajaxify-script + .document-script');

					// Fetch the scripts inside the content area
					$scripts = $dataContent.find('.document-script');
					if ($scripts.length) {

					    //if we have script inside the content area, 
					    //add the <span class="ajaxify-script"/> infront of it
					    $scripts.each(function () {
					        if (!$(this).prev('span.ajaxify-script').length)
					        {
					            $('<span class="ajaxify-script"/>').insertBefore($(this));
					        }
					    });
					    //re-calculate all the scripts needed to be executed after inserting step above
                        //and before detaching all scripts inside the content!
					    $allScripts = $data.find('span.ajaxify-script + .document-script');
						$scripts.detach();
					}
				    
					// Fetch the content
					contentHtml = $dataContent.html()||$data.html();
					if ( !contentHtml ) {
						document.location.href = url;
						return false;
					}
					
					// Update the menu
					$menuChildren = $menu.find(menuChildrenSelector);
					$menuChildren.filter(activeSelector).removeClass(activeClass);
					$menuChildren = $menuChildren.has('a[href^="'+relativeUrl+'"],a[href^="/'+relativeUrl+'"],a[href^="'+url+'"]');
					if ( $menuChildren.length === 1 ) { $menuChildren.addClass(activeClass); }

					// Update the content
					$content.stop(true,true);
					$content.html(contentHtml).ajaxify().css('opacity',100).show(); /* you could fade in here if you'd like */

					// Update the title
					document.title = $data.find('.document-title:first').text();
					try {
						document.getElementsByTagName('title')[0].innerHTML = document.title.replace('<','&lt;').replace('>','&gt;').replace(' & ',' &amp; ');
					}
					catch ( Exception ) { }
					
					scriptLoader($allScripts);

					// Complete the change
					if ( $body.ScrollTo||false ) { $body.ScrollTo(scrollOptions); } /* http://balupton.com/projects/jquery-scrollto */
					$body.removeClass('loading');
					$window.trigger(completedEventName);
	
					// Inform Google Analytics of the change
					if ( typeof window._gaq !== 'undefined' ) {
						window._gaq.push(['_trackPageview', relativeUrl]);
					}

					// Inform ReInvigorate of a state change
					if ( typeof window.reinvigorate !== 'undefined' && typeof window.reinvigorate.ajax_track !== 'undefined' ) {
						reinvigorate.ajax_track(url);
						// ^ we use the full url here as that is what reinvigorate supports
					}
				},
				error: function(jqXHR, textStatus, errorThrown){
					document.location.href = url;
					return false;
				}
			}); // end ajax

		}); // end onStateChange

	}); // end onDomLoad

})(window); // end closure
