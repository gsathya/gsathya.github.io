var cmd;

function createPrompt() {
    $('.container').append('<div class="ps"><label for="input" id="prompt"><span id="dir">/</span> $</label><div class="inputbox"><input type="text" id="input"/></div></div><div class="result"></div>');
    
}

function convertTextBoxToP() {
    $('.ps').replaceWith('<p><span id ="dir"> / </span> : '+ cmd +'</p>')
}

function showHelp() {
    $('.result:last').append('<div id="hideit" class="help"><p> commands are <br /></div>');
    $('.help').slideDown('fast');
    createPrompt();
}

function wrongCommand() {
    $('.result:last').append('<div id="hideit" class="wrongCommand"><p> '+cmd+' does not exist. Check `help`.');
    $('.wrongCommand').slideDown('fast');
    createPrompt();
}
$(document).ready(function() {

    createPrompt();

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
