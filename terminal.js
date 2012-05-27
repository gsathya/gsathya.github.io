var cmds = {}, cmd, branch = 'master', is_git_repo = false, path_sep = "&#8725;", dir = path_sep+'gsathya', repos = {}, pwd, branches, branch_dom;
var username = 'gsathya';
var prompt_dom = [];

function createPrompt() {
    prompt_dom = [];
    prompt_dom.push('<span id="arrow">&rarr;</span>');
    prompt_dom.push('<span id="dir">'+dir+'</span>');
    if (pwd in repos)
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
    dom_elements.push('<span id="cmd">'+cmd.join(' ')+'</spand>');
    $('.ps').replaceWith('<p>'+ prompt_dom.join(' ') +'</p>');
}

function help() {
    var help_dom = [];

    $.each(cmds, function( key , val ){
        help_dom.push('<p><span id="cmd">'+key+'</span><span id="arrow"> &rarr; </span><span id="desc">'+val.gist+'</span></p>');
    });

    $('.result:last').append('<div id="hideit" class="help">'+help_dom.join('')+'</div>');
    $('.help').slideDown('fast');
    createPrompt();
}

function wrongCommand() {
    $('.result:last').append('<div id="hideit" class="wrongCommand"><p><span id="cmd"> '+cmd.join(' ')+'</span> does not exist. Check `help`.');
    $('.wrongCommand').slideDown('fast');
    createPrompt();
}

function getRepos() {
    $.getJSON('https://api.github.com/users/gsathya/repos', function( data ) {
        $.each(data, function( i, item ) {
            repos[item.name] = { 'desc': item.description, 'url': item.html_url };
        });
    });
}

function getCmds() {
    $.getJSON('cmd.json', function( data ) {
        $.each(data['commands'], function( i, item ) {
            cmds[item.name] = { 'args': item.args, 'gist': item.gist };
        });
    });
}

function ls(){
    var ls_dom = [];

    $.each(repos, function( key, val ){
        if (val.desc)
            ls_dom.push('<p><span id="cmd">'+key+'</span><span id="arrow"> &rarr; </span><span id="desc">'+val.desc+'</span></p>');
        else
            ls_dom.push('<p><span id="cmd">'+key+'</span></p>');
    });

    $('.result:last').append('<div id="hideit" class="ls">'+ls_dom.join('')+'</div>');
    $('.ls').slideDown('fast');
    createPrompt();
}

function whoami() {
    whoami_blob = "nub kid, <3 neena";
    whoami_dom = '<p><span id="cmd">'+whoami_blob+'</span></p>';
    $('.result:last').append('<div id="hideit" class="ls">'+whoami_dom+'</div>');
    $('.ls').slideDown('fast');
    createPrompt();
}

function cd() {
    if( cmd[1] in repos ) {
        pwd = cmd[1];
        dir = path_sep+username+path_sep+pwd;
        getBranches();
        createPrompt();
    } else if( cmd[1] == '..' ) {
        pwd = ''
        dir = path_sep+username;
        createPrompt();
    } else {
        wrongCommand();        
    }


}

function clear() {
    $('.container').remove();
    $('body').append('<div class="container"></div');
    createPrompt();
}

function open() {
    var where;
    switch( cmd[1] ) {
        case "github": where = "https://www.github.com"; break;
        case "twitter": where = "https://www.twitter.com/sathya3445"; break;
        default: if ( cmd[1] in repos ) {
            where = "https://www.github.com/"+username+'/'+cmd[1];
        } break;
    }
    
    if( where ) {
        window.location.replace( where );
    } else {
        wrongCommand();        
    }
}

function getBranches() {
    branches = [];
    $.getJSON('https://api.github.com/repos/'+username+'/'+pwd+'/git/refs', function( data ) {
        $.each(data, function( i, item ) {
            branches.push(item.ref.split('/')[2]);
        });
    });
}


function git() {
    if ( pwd in repos) {
        switch( cmd[1] ) {
            case 'branch': git_branch(); break;
            case 'log': git_log(); break;
            case 'checkout': git_checkout(); break;
            default: wrongCommand(); break;
        }
    } else {
        git_error();
    }
}

function git_error() {
    $('.result:last').append('<div id="hideit" class="wrongCommand"><p><span id="cmd"> '+cmd.join(' ')+'</span> will work only if inside a git repo.');
    $('.wrongCommand').slideDown('fast');
    createPrompt();
}

function git_log() {
    $('.result:last').append('<div id="hideit" class="help"><p>still working it ...</p></div>');
    $('.help').slideDown('fast');
    createPrompt();

}
function git_checkout() {

    if ($.inArray(cmd[2], branches) > 0){
        branch = cmd[2];
        createPrompt();
    } else {
        wrongCommand();
    }
}

function git_branch() {
    branch_dom = [];

    $.each(branches, function( i, item ){
        branch_dom.push('<span id="cmd">'+item+"</span>");
    });
    
    $('.result:last').append('<div id="hideit" class="help"><p><span id="doc">Branches </span><span id="arrow"> &rarr; </span>'+branch_dom.join(', ')+'</p></div>');
    $('.help').slideDown('fast');
    createPrompt();

}


$(document).ready(function() {

    createPrompt();
    getCmds();
    getRepos();
    
    
    $('#input').live('keypress', function(event) {
        if( event.keyCode == 13) {
            cmd = $(this).val();
            cmd = cmd.split(' ');
            convertTextBoxToP();
            
            switch( cmd[0] ){
                case "cd": console.log("cd"); cd(); break;
                case "help": console.log("help"); help(); break;
                case "ls": console.log("ls"); ls(); break;
                case "open": console.log("open"); open(); break;
                case "git": console.log("git"); git(); break;
                case "clear": console.log("clear"); clear(); break;
                case "whoami": console.log("whoami"); whoami(); break;
                default : console.log("wrong command"); wrongCommand(); break;
            }
        }       
    });
});
