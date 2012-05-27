var cmds = {}, cmd, dir = 'gsathya', branch = 'master', is_git_repo = false, path_sep = "&#8725;", repos = [];
var username = 'gsathya';
var prompt_dom = [];

function createPrompt() {
    prompt_dom = [];
    prompt_dom.push('<span id="arrow">&rarr;</span>');
    prompt_dom.push('<span id="dir">'+path_sep+dir+'</span>');
    prompt_dom.push('<span id="git">git:(</span><span id="branch">'+branch+'</span><span id="git">)</span>');

    $('.container').append('<div class="ps"><label for="input" id="prompt">'+prompt_dom.join(' ')+'<span id="dollar"> &#x24; </span></label><div class="inputbox"><input type="text" id="input"/></div></div><div class="result"></div>');
    
    //Scroll down
    $('html, body').animate({ 
        scrollTop: $('input').offset().top
    }, 1000);
    
}

function convertTextBoxToP() {
    var dom_elements = prompt_dom;
    dom_elements.push('<span id="colon">&#58;</span>');
    dom_elements.push('<span id="cmd">'+cmd+'</spand>');
    $('.ps').replaceWith('<p>'+ prompt_dom.join(' ') +'</p>');
}

function showHelp() {
    var help_dom = [];

    $.each(cmds, function(key , val){
        help_dom.push('<p><span id="cmd">'+key+'</span><span id="arrow"> &rarr; </span><span id="desc">'+val.gist+'</span></p>');
    });

    $('.result:last').append('<div id="hideit" class="help">'+help_dom.join('')+'</div>');
    $('.help').slideDown('fast');
    createPrompt();
}

function wrongCommand() {
    $('.result:last').append('<div id="hideit" class="wrongCommand"><p><span id="cmd"> '+cmd+'</span> does not exist. Check `help`.');
    $('.wrongCommand').slideDown('fast');
    createPrompt();
}

function getRepos() {
    $.getJSON('https://api.github.com/users/gsathya/repos', function(data) {
        $.each(data, function(i, item) {
            repos.push([item['name'], item['description'], ['html_url']]);
        });
        console.log(repos);
    });
}

function getCmds() {
    $.getJSON('cmd.json', function(data) {
        $.each(data['commands'], function(i, item) {
            cmds[item.name] = { 'args':item.args, 'gist':item.gist };
        });
    });
}

$(document).ready(function() {

    createPrompt();
    getCmds();
    //getRepos();
    
    
    $('#input').live('keypress', function(event) {
        if( event.keyCode == 13) {
            cmd = $(this).val();
            convertTextBoxToP();
            switch(cmd)
            {
                case "help": console.log("help"); showHelp(); break;
                default : console.log("wrong command"); wrongCommand(); break;
            }
        }       
    });
});
