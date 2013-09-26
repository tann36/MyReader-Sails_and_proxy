var master = []; //holds all articleSection data for simple access
var readabilityParsedArticles = []; //holds articles already parsed by Readability, to minimize API calls
//var parserApiToken = '2c607eb83344131b730f0f2739958e414f21a5a6'; 	//get your own from http://www.readability.com/developers/api/parser
var solrHost = 'http://localhost:8008/solr'; //proxy for solr

/* Templates */

/* Template for content in orbit slider */
var orbitBigTemplateText = 
	"<li data-orbit-slide='{{id}}'>\
		<div>\
			<div class='large-3 columns meta'> \
				{{#if author}}<span class='author'>{{author}}</span>{{/if}} \
				{{#if date}}{{#date date}}{{/date}}{{/if}} \
				<span class='source'>{{#if source-link}}Source: <a href='{{source-link}}'>{{source}}</a>\
				{{else}}Source: {{source}}{{/if}}</span>\
				{{#if link}}<span class='source'><a href='{{link}}'>View original</a></span>{{/if}}\
			</div>\
			<div class='large-9 columns'> \
				<h3 class='post-title'><a href='#' data-reveal-id='articleModal' id='{{link}}'>{{title}}</a></h3> \
				<div class='post ftPost'>{{{description}}}</div> \
			</div>\
		</div>\
	</li>";
	
/* Template for showing news in full size */
var simpleNewsTemplateText = 
	"<div class='row'>\
		<div class='large-3 small-12 columns meta'> \
			{{#if author}}<span class='author'>{{author}}</span>{{/if}} \
			{{#if date}}{{#date date}}{{/date}}{{/if}} \
			<span class='source'>{{#if source-link}}Source: <a href='{{source-link}}'>{{source}}</a>\
			{{else}}Source: {{source}}{{/if}}</span>\
			{{#if link}}<span class='source'><a href='{{link}}'>View original</a></span>{{/if}}\
			{{#if category}}<a href='#' class='tags tiny secondary button dropdown' data-dropdown='taglist-{{id}}'>Tags</a>\
				<ul id='taglist-{{id}}' class='f-dropdown hide' data-dropdown-content>\
					{{#if category}}{{#tags category}}{{/tags}}{{/if}}\
			</ul>{{/if}}\
		</div>\
		<div class='large-9 columns'> \
			<h3 class='post-title'><a href='#' data-reveal-id='articleModal' id='{{link}}'>{{title}}</a></h3> \
			<div class='post'>{{{description}}}</div> \
		</div>\
	</div><hr>";

/* Template for showing news in small box, half page wides */
var oneNewsTemplateText = 
	"<div class='small-12 columns article-piece'>\
		<h3 class='post-title'><a href='#' data-reveal-id='articleModal' id='{{link}}'>{{title}}</a></h3> \
		<div class='post'>{{{description}}}</div>\
	</div>\
	<div class='small-12 columns meta small'> \
		{{#if author}}<span class='author'>{{author}}</span>{{/if}} \
		{{#if date}}{{#date date}}{{/date}}{{/if}} \
		<span class='source'>{{#if source-link}}Source: <a href='{{source-link}}'>{{source}}</a>\
		{{else}}Source: {{source}}{{/if}}</span>\
		{{#if link}}<span class='source'><a href='{{link}}'>View original</a></span>{{/if}}\
	</div>";
	

var modalTemplateText = 
	"<div class='row'>\
		<div class='small-12 large-8 large-centered columns'>\
			<h3>{{title}}</h3>\
			<div>{{{content}}}</div>\
		</div>\
		<div class='small-12 large-8 large-centered columns meta small'> \
			{{#if author}}<span class='author'>{{author}}</span>{{/if}} \
			{{#if date_published}}{{#date date_published}}{{/date}}{{/if}} \
			{{#if url}}<span class='source'><a href='{{url}}'>View original</a></span>{{/if}}\
		</div>\
	</div>";
	
/* Tag-list creator */
Handlebars.registerHelper('tags', function(items, options) {
	$out = "";
	
	for(var i=0, l=items.length; i<l; i++) {
		$out = $out +  "<li class='tag'>" + items[i] + "</li>";
	}

	return $out;
});


/* Date area creator */
Handlebars.registerHelper('date', function(date) {
	  
	$out = "<span class='date'>";
	$out += formatDateTimes(date);
	return $out + "</span>";
});

/* Description shortener */
Handlebars.registerHelper('descShort', function(description){
	$out = description.substring(0, description.indexOf('</p>')+4);
	//console.log($out.length);
	if ($out.length <  250){
		$out = description.substring(0, description.indexOf('</p>', $out.length));
	}
	return $out;
});

var oneNewsTemplate = Handlebars.compile(oneNewsTemplateText);
var orbitBigTemplate = Handlebars.compile(orbitBigTemplateText);
var simpleNewsTemplate = Handlebars.compile(simpleNewsTemplateText);
var modalTemplate  = Handlebars.compile(modalTemplateText);


function searchObject(options){
	this.q = options.term;
	this.df = options.field;
}

// Object for holding information about articleSection
// has many options and two functions:
// minify - makes section small
// magnify - makes section large and shows articles in full sizeToContent
// TODO: use readability parser to make articles cleaner
function articleSection(options){
	/* Properies */
	
	// Required properties are target, tags, template and name. Color and topic are recommended. All others have default settings.
	this.target = options.target; //element id to put rendered news in. (Include # !!! :  example: #idname)
	this.items = options.items; //array with loaded raw data
	this.tags = options.tags; //words to search by (one string, words separated by spaces) Currently doesn't support multiword tags
	this.color = options.color; //header color (name of colorclass from css)
	this.numOfEntriesAtOnce = options.numOfEntriesAtOnce || 10; // max number of articles to load with one query
	this.entriesToShow = options.entriesToShow || 1; //number of article from certain category/object to show by default on homepage
	this.template = options.template; // name of the Handlebars template to use for showing articles
	this.name = options.name; // name to differentiate between different articleSections. This is currently only used to give tag dropdowns unique ids
	this.hidingBehavior = options.hidingBehavior || 'small'; 	// hidden, small, none...
																					// Hidden - section is not shown
																					// Small - section is shown in halfsize (like initially on homepage)
	this.showBehavior = options.showBehavior || 'simple'; 	// This is not used for anything yet, but 
																					// it might be used to add fancy effects when articlesection is magnified
	this.numOfEntriesToShowBigAtOnce = options.numOfEntriesToShowBigAtOnce || 10; // Number of articles to show when articlesection is magnified
	this.topic = options.topic; // This is used to show section name/search criteria on section header bar
	this.isMagnified = options.isMagnified || false;
	/* Methods */
		
	// Accepts array
	this.addTags = function(tag){
		this.tags += tag;
	};
	
	/* Makes article section small again */
	this.minify = function(quietly){
		
		$target = this.target;

		if (quietly){
			$($target).removeClass('large-12').addClass('large-6');
		} else {
			$($target).removeClass('large-12').addClass('large-6', 1000, 'easeInOutQuart');
		}
		
		if (this.hidingBehavior == 'small'){
			$($target).removeClass('openSection', 1000);
			$container = $($target),
			$noRemove = $container.find('.sectionTitle');

			$news = this.items.response.docs;
			
			$($target).addClass('small-sec');
			
			$($target).html($noRemove);
			//$news[0].id = $name + 0;
			console.log($news[0]);
			$result = this.template($news[0]);
			
			$($target).append($result);    
	
		 }else if (this.hidingBehavior == 'hidden'){
			$($target).removeClass('openSection');		
			$($target).hide();
			$($target).empty();
		}
	}
	
	/* show section with many articles */
	this.magnify = function(){
		$news = this.items.response.docs;
		$target = this.target;
		
		$($target).empty();
		
		$($target).prepend('<h3 class="sectionTitle ' + this.color + '">' + this.topic + '</h3>');
		
		$amount = this.numOfEntriesToShowBigAtOnce;
		
		$numOfItems = $news.length;
		
		// Add result as parents first element
		$($target).prependTo($($target).parent());  
		//$($target).removeClass('preloader');
			
		$($target).show();
		$($target).removeClass('large-6', 1000, 'easeInOutQuart').addClass('large-12').addClass('openSection', 1000, 'easeInOutQuart').removeClass('small-sec');

		// Animate motion to section start
		$pos = $($target).offset().top - $('nav').height();
		if ($(window).width() < 768){
			$pos = $($target).offset().top;
		}
		$('html, body').delay(1000).animate({scrollTop: $pos }, 2000);
		hideTargetSiblings($target);
		
		showMoreResults(this,0);
	}
};

/* target - id of element */
function hideTargetSiblings($target){
	for ( i = 0; i < master.length; i++){
		if (master[i].target != $target){
			master[i].minify(true);
		}
	}
}

// call parent first, assign variables only then (won't work the other way round)
/* Actually, I don't know why I thought this was neccesary, articleSection does exactly the same thing and has more options */
function searchSection(options){

	articleSection.call(this);

	this.target = options.target; //element to put rendered news in
	this.items = options.items; //array with loaded raw data
	this.tags = options.tags; //words to search bby
	this.color = options.color; //headers color
	this.numOfEntriesByDefault = options.numOfEntriesByDefault ||10;
	this.template = options.template;
	this.name = options.name;
	
}

/* Gets all news with some keywords (keywords defined in object), displays max 5 in orbit slider, returns raw data of all found news */
function getFeatured($obj, callBack){
	
	$.ajax({
		data: {'wt':'json', 'q':$obj.tags, 'rows':$obj.numOfEntriesAtOnce, 'df':'source', 'bf':'recip(ms(NOW,date),3.16e-11,1,1)', 'sort':'date desc'},
		url: solrHost + '/select',
		success: function(data) { 
			//console.log(data);
			$res = data.response.docs;
			$num = Math.min(5, data.response.numFound);
			for (var i=0; i <= $num-1; i++)
			{
				$res[i].id = $obj.name + i;
				// data.response.docs[i] = $res[i];
				$des = $res[i].description;
				$res[i].description = stripUnneccesary($des);
				
				$result = $obj.template($res[i]);
				
				$($obj.target).append($result);   

			}
			$($($obj.target).parent()).addClass('postarea');
			$(document).foundation();
		
			$obj.items = data;
			$featuredNews.items = data;
			master.push($featuredNews);
		},
		dataType: 'jsonp',
		jsonp: 'json.wrf' 
	});		
}

/* Gets all news for some section by keywords, shows only one, returns all */
function getBoxedNews($obj){
	$res = [];
	$dest = $obj.name;
	$.ajax({
		data: {'wt':'json', 'q':$obj.tags, 'df':'category', 'rows':$obj.numOfEntriesAtOnce, 'sort':'date desc'},
		url: solrHost + '/select',
		success: function(data) {
			$obj.items= data;
			$res = data.response.docs;
			$($($obj.target).prepend('<h3 class="sectionTitle ' + $obj.color + '">' + $obj.name + '</h3>'));
			if (!$obj.isMagnified){
				for (var i=0; i <= $obj.entriesToShow - 1; i++){

					$res[i].id = $obj.name + i;
					console.log($obj.name);
						//console.log(data2);
						//$res[i].description = data2.content;
						//$res[i].excerpt = data2.excerpt;
						//$obj.items.response.docs[i].excerpt = data2.excerpt;
					$des = $res[i].description;
					$res[i].description = stripUnneccesary($des);
					$result = $obj.template($res[i]);		
			
					$($obj.target).append($result);    
					
				}
				
				
				//$($obj.target).addClass('small-sec');	
			}else{
			
				showMoreResults($obj,0);
				//$($obj.target).append('<div class="row more"><div class="small-12 button" data-start="' + $obj.entriesToShow + '">More results</div></div><hr>');
			}
			
		},		
		dataType: 'jsonp', 
		jsonp: 'json.wrf' 
	});
}

function stripUnneccesary($desc){
	$return = $desc;
	if ( $desc.indexOf("slashdot") >= 0 ){
		$return = "<p>" + $desc.slice($desc.indexOf('"'), $desc.indexOf('<p><div class="share_submission"')) + "</p>";
	}
	return $return;
}


function createCategoryElements(){
	var categories = ["marketing", "startup", "cloud", "gadget", "technology"];//
	var minifiedCategoryElementClasses = "large-6 small-12 columns small-sec";
	
	var parent = document.getElementById("categories");
	for (var i = 0; i < categories.length; i++){
		var categoryEl = document.createElement("div");
		categoryEl.className = minifiedCategoryElementClasses;
		categoryEl.id = categories[i];
		categoryEl.ondragover= function(event){allowDrop(event);};
		categoryEl.ondrop = function(event){drop(event);};
		categoryEl.ondragstart = function(event){drag(event);};
		categoryEl.draggable = true;
		 
		parent.appendChild(categoryEl);
	}
	
	var divs = ["featured", "filtered"];
	for (var i = 0; i < divs.length; i++){
		var divEl = document.createElement("div");
		divEl.className = minifiedCategoryElementClasses;
		divEl.id = divs[i];
		parent.appendChild(divEl);
		$('#' + divs[i]).hide();
	}
	
	//div for search results
	/*var filteredDiv = document.createElement("div");
	filteredDiv.id = "filtered";
	parent.appendChild(filteredDiv);
	filteredDiv.style.display = 'none';
	*/
	
}

// dragging sections: save the id of the dragged element, when drag starts
function drag(ev){
	ev.dataTransfer.setData("Text", ev.target.id);
}

// dragging sections: place the dragged element
function drop(ev){
	ev.preventDefault();
	var draggedElementId = ev.dataTransfer.getData("Text");
	var parent = document.getElementById("categories");
	var target = ev.target; //drop target
	
	while(target.parentNode != null && target.parentNode.id != "categories"){
		target = target.parentNode;
	}	
	
	if(draggedElementId == target.id) return;
	if(target.parentNode == null) return;
	
	var draggedElement = document.getElementById(draggedElementId);
	
	//place dragged element
	if(indexOfChild(draggedElement) > indexOfChild(target)){
		parent.removeChild(draggedElement);		
		parent.insertBefore(draggedElement, target);
	} else{
		parent.removeChild(draggedElement);		
		if (target.nextSibling) {
			parent.insertBefore(draggedElement, target.nextSibling);
		} else {
		  parent.appendChild(draggedElement);
		}
	}
}

function indexOfChild(element){
	var i = 0;
	while((element = element.previousSibling) != null) 
		i++;
	return i;
}

// dragging sections: makes it possible to drop items on this element
function allowDrop(ev){
	ev.preventDefault();
}


$(document).ready(function(){
	
	/* Create all objects for different categories */
	createCategoryElements();
	
	// Get tag
	var parts = document.URL.split("tag/");
	var tag = parts[1];
	$section = null;
	
	// Gets everything that has source: readability
	$orbitNews = new articleSection({
		target: '#newsOrbit',
		tags: "readability", 
		color: 'cyan',
		numOfEntriesAtOnce: 50,
		entriesToShow: 5,
		template: orbitBigTemplate,
		name: 'Featured',
		topic: 'Featured'
	});
	
	$marketingNews = new articleSection({
		target: '#marketing',
		tags: "marketing business",
		color: 'emerald',
		numOfEntriesAtOnce: 50,
		entriesToShow: 1,
		template: oneNewsTemplate, 
		name: 'Marketing',
		hidingBehavior: 'small',
		topic: 'Marketing',
	});
	if(tag == 'marketing')
		$section = $marketingNews;
	
	$cloudNews = new articleSection({
		target: '#cloud',
		tags: "cloud",
		color: 'cobalt',
		numOfEntriesAtOnce: 50,
		entriesToShow: 1,
		template: oneNewsTemplate,
		name: 'Cloud',
		hidingBehavior: 'small',
		topic: 'Cloud'
	});
	if(tag == 'cloud')
		$section = $cloudNews;
	
	$startupNews = new articleSection({
		target: '#startup',
		tags: "startup innovation universities",
		color: 'crimson',
		numOfEntriesAtOnce: 50,
		entriesToShow: 1,
		template: oneNewsTemplate,
		name: 'Startup',
		hidingBehavior: 'small',
		topic: 'StartUp'
	});
	if(tag == 'startup')
		$section = $startupNews;
	
	$gadgetNews = new articleSection({
		target: '#gadget',
		tags:  "gadgets gadget *phone mobile android tablet*",
		color: 'violet',
		numOfEntriesAtOnce: 50,
		entriesToShow: 1,
		template: oneNewsTemplate,
		name: 'Gadget',
		hidingBehavior: 'small',
		topic: 'Gadget'
	});
	if(tag == 'gadget')
		$section = $gadgetNews;
	
	$technoNews = new articleSection({
		target: '#technology',
		tags: "windows 4G tech technology apps ios linux",
		color: 'yellow',
		numOfEntriesAtOnce: 50,
		entriesToShow: 1,
		template: oneNewsTemplate,
		hidingBehavior: 'small',
		name: 'Technology',
		topic: 'Technology'
	});
	if(tag == 'technology')
		$section = $technoNews;
	
	$searchResults = new articleSection({
		target: '#filtered',
		color: 'orange',
		numOfEntriesAtOnce: 50,
		entriesToShow: 0,
		template: simpleNewsTemplate,
		hidingBehavior: 'hidden'
	});
	
	// This is used to show news from orbit 
	$featuredNews = new articleSection({
		target: '#featured',
		color: 'cyan',
		numOfEntriesAtOnce: 50,
		template: simpleNewsTemplate,
		name: 'Readability',
		topic: 'Readability',
		hidingBehavior: 'hidden'
	});
	
	// Register all articleSections
	
	master.push($marketingNews);
	master.push($cloudNews);
	master.push($startupNews);
	master.push($technoNews);
	master.push($gadgetNews);
	master.push($searchResults);

	// Get and render articles/news
	getFeatured($orbitNews);
	
	//$section = $marketingNews;//777
	if($section){
		$section.isMagnified = true;
		$section.entriesToShow = 10;
	}
	//$section.template = simpleNewsTemplate;
	
	getBoxedNews($marketingNews);
	getBoxedNews($cloudNews);
	getBoxedNews($startupNews);
	getBoxedNews($technoNews);
	getBoxedNews($gadgetNews);
	
	
	if($section){
		$target = $section.target;
		$($target).empty();
		//$($target).prepend('<h3 class="sectionTitle ' + $section.color + '">' + $section.topic + '</h3>');

		$($target).prependTo($($target).parent());  
		$($target).show();
		$($target).removeClass('large-6', 1000, 'easeInOutQuart').addClass('large-12').addClass('openSection', 1000, 'easeInOutQuart');
		$($target).removeClass('small-sec');
		
		$pos = $($target).offset().top - $('nav').height();
		if ($(window).width() < 768){
			$pos = $($target).offset().top;
		}

		//showMoreResults($section, 0);
	}
});

/* If author is clicked, call search */
$(document).on('click', '.author', function(){
	
	$srchObj = new searchObject({
		term: $(this).html(),
		field: 'author',
	});
	search($srchObj);
	//search("author", $(this).html());
});

/* Creates search query from search object's key-value pairs, 
	sends query and passes return data to function dealWithSearch */
function search($obj){

	$data = {'wt':'json'}
	
	// Loop through key-value paris in searchobject
	$.each($obj, function(key, element) {
		if (key && element){
			$data[key] = element;
		}
	});

	if ($data['q']){		
		$.ajax({
			url: solrHost + '/select',
			data: $data,
			success: function(data) { 
				$searchResults.items = data;
				dealWithSearch($searchResults, $obj);
			},
			dataType: 'jsonp',
			jsonp: 'json.wrf'// 111
		});	
	} 
}


/* Search */
$('#searchForm').submit( function(event){
	event.preventDefault();
	$srchBox = $('input[name="searchTerm"]');
	$searchTerm = $srchBox.val();
	if ($searchTerm){
		
		$srchObj = new searchObject({
			term: $searchTerm,
			field: ''
		});
		
		search($srchObj);
		$srchBox.val('');
	}
	
});

$('input[name="srch"]').click(function(){
	$('#searchForm').trigger('submit');
});

/* Adds id to all docs from search result, 	
	assigns searched string as searchResults topic, 
	and calls articleSection.magnify */
function dealWithSearch($data, $obj){
	$res = $data.items.response.docs;
    for (var i=1; i <= $res.length-1; i++)
	{ 
		$data.items.response.docs[i].id = i;
	}
	//If default search field is null
	if ($obj['df'] == ""){
		$obj['df'] ="Search";
	}
	$data.topic = $obj['df'] + ": " + $obj['q'];
	
	//if reveal modal is open, close it
	$('.close-reveal-modal').trigger('click');
	$('.reveal-modal').css('display','none');
	$('.reveal-modal').removeClass('open');
	$('.reveal-modal-bg').remove();
	$('#articleModal').empty();
	$data.magnify();
}


/* All of these toggle loading, showing and hiding articleSections */

$(document).on('click', '#cloud h3.sectionTitle', function(){
	$owner = findTargetOwner('#cloud');
	if ($('#cloud').hasClass('openSection')){
		$owner.minify();
	}else{
		$owner.magnify();
	}
});

$(document).on('click', '#startup h3.sectionTitle', function(){
	$owner = findTargetOwner('#startup');
	if ($('#startup').hasClass('openSection')){
		$owner.minify();
	}else{
		$owner.magnify();
	}
});

$(document).on('click', '#marketing h3.sectionTitle', function(){
	$aaa = findTargetOwner('#marketing');
	if ($('#marketing').hasClass('openSection')){
		console.log($aaa);
		$aaa.minify();
	}else{
		$aaa.magnify();
	}
});

$(document).on('click', '#gadget h3.sectionTitle', function(){
	$owner = findTargetOwner('#gadget');
	if ($('#gadget').hasClass('openSection')){
		$owner.minify();
	}else{
		$owner.magnify();
	}
});

$(document).on('click', '#technology h3.sectionTitle', function(){
	$owner = findTargetOwner('#technology');
	if ($('#technology').hasClass('openSection')){
		$owner.minify();
	}else{
		$owner.magnify();
	}
});

$(document).on('click', '#filtered h3.sectionTitle', function(){
	$owner = findTargetOwner('#filtered');
	if ($('#filtered').hasClass('openSection')){
		$owner.minify();
	}
});

$(document).on('click', '#featured h3.sectionTitle', function(){
	$owner = findTargetOwner('#featured');
	if ($('#featured').hasClass('openSection')){
		$owner.minify();
	}
});

$(document).on('click', '#ftTitle', function(){
	$owner = findTargetOwner('#featured');
	if ($('#featured').hasClass('openSection')){
		$owner.minify();
	}else{
		$owner.magnify();
	}
});


// Delegate function for loading more articles
$(document).delegate('.more', 'click', function() {
	$target = '#' + $($(this).parent()).attr('id');
	
	$startNum = $($(this).children('.button')).data('start');
	$parent = findTargetOwner($target);
	if ($parent){
		$($(this).next('hr')).remove();
		$(this).remove();
		showMoreResults($parent, $startNum);
	}
});

function findTargetOwner($target){
	for ( i = 0; i < master.length; i++){
		if (master[i].target == $target){
			return master[i];
		}
	}
	return null;
}

//TODO: animate result adding
//TODO: if numFound is greater than docs.length, then new query
/* 	Adds specific amount of articles to certain section
	$data - raw data from ajax query with all articles
	$startNum - number of first entry to get from $data
	$target - id of target element aka where to attach articles (without #)	
*/
function showMoreResults($data, $startNum){
	$name = $data.name;
	$target = $data.target;
	$news = $data.items.response.docs;
	//console.log($news);
	$total = $data.items.response.numFound;
	$amount = $data.numOfEntriesToShowBigAtOnce;
	$numOfArticles = $news.length;
	//console.log("kokku leitud: "  + $total + ", hetkel saadaval: " + $numOfArticles + ", järgmine: " + $startNum+$amount + ", target: " + $target);
	if ($startNum < $numOfArticles){
		for (var i=$startNum; i < $startNum + $amount; i++)
		{
			$news[i].id = $name+i;
			$result = simpleNewsTemplate($news[i]);
			$($target).append($result);   
			//console.log($result);
		}
		$($target).append('<div class="row more"><div class="small-12 button" data-start="' + ($amount + $startNum) + '">More results</div></div><hr>');
	}else{
		if ($total > $numOfArticles){
			getMoreArticles($data, $startNum);
		}
	}	
}

/*Load more articles from database
Number of articles to load is determined by numOfEntriesAtOnce
On success, append loaded articles to articleSection object
and display more articles
*/
function getMoreArticles($obj, $startNum){
	$firstElemNum = $obj.items.response.docs.length;
	$name = $obj.name;
	$.ajax({
		data: {'wt':'json', 'q':$obj.tags, 'df':'category', 'start':$firstElemNum, 'rows':$obj.numOfEntriesAtOnce, 'sort':'date desc'},
		url: solrHost + '/select',
		success: function(data) {
			console.log(data);
			$obj.items.response.docs = $obj.items.response.docs.concat(data.response.docs);
			console.log($obj);
			showMoreResults($obj,$startNum);
		},		
	dataType: 'jsonp',
	jsonp: 'json.wrf'
	});
}

/* clicking on article title calls Readability API with this articles URL, 
	and shows return data in modal dialog */
$(document).on('click', '.post-title', function(){
	$url = $($(this).children('a')).attr('id');
	//console.log($url);
	if ($url != null){
		useParser($url, function(data){
			//console.log(data);
			$('#articleModal').empty();
			$('#articleModal').html(modalTemplate(data));
			$('#articleModal').append('<a class="close-reveal-modal">&#215;</a>');
			//console.log(data.excerpt);
		});
	}
});

/* 	First searches for $url in array readabilityParsedArticles. 
	If this url is found, then returns data from same array.
	Calls Readability Parser API only if this article hasn't already been parsed.
*/
function useParser($url, callback){
	//console.log(readabilityParsedArticles);
	for (var i = 0; i<readabilityParsedArticles.length; i++){
	
		if (readabilityParsedArticles[i].link == $url){
			return callback(readabilityParsedArticles[i].data);
		}
	}
	
	if ($url != null){
		//console.log('localhost:1337/readabilityArticle?urlString=' + $url);
		
		//var parameters = encodeURIComponent(
		//var urlparts = $url.split("?");
		$.ajax({
			//url: 'https://readability.com/api/content/v1/parser?url=' + $url + '&token=' + parserApiToken,
			url: 'http://localhost:1337/readabilityArticle?urlString=' + encodeURIComponent($url),
			success: function(data){
				//console.log(data);
				readabilityParsedArticles.push({'link':$url, 'data':data});
				return callback(data);
			},
			dataType: 'json',
			jsonCallback: 'callback'
		});
	}
}

$(document).on('click', 'li.tag', function(){
	$srchObj = new searchObject({
		term: $(this).html(),
		field: 'category',
	});
	search($srchObj);

});

/* Gets date in database format 'YYYY-MM-DD'T'HH:mm:SS'Z'', 
	parses it and returns 'DD MON YYYY HH:mm' */
function formatDateTimes(date) {
   var year = date.substr(0, 4);
    var month = date.substr(5, 2);
    var day = date.substr(8, 2);
    var hour = date.substr(11, 2);
    var min = date.substr(14, 2);
    var mon = "";
    var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

    switch (month) {
        case "01":
            mon = months[0];
            break;
        case "02":
            mon = months[1];
            break;
        case "03":
            mon = months[2];
            break;
        case "04":
            mon = months[3];
            break;
        case "05":
            mon = months[4];
            break;
        case "06":
            mon = months[5];
            break;
        case "07":
            mon = months[6];
            break;
        case "08":
            mon = months[7];
            break;
        case "09":
            mon = months[8];
            break;
        case "10":
            mon = months[9];
            break;
        case "11":
            mon = months[10];
            break;
        case "12":
            mon = months[11];
            break;
    }
    return day + " " + mon + " " + year + " " + hour + ":" + min; 
}
