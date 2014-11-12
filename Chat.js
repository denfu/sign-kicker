Chats = new Mongo.Collection("Chat");

ChatManager = {
    addChat : function(msg) {
        if (!msg.trim()) return ;

        var chat = {
            creationDate : new Date(),
            userId : Meteor.userId(),
            username : Meteor.user().profile? Meteor.user().profile.username : Meteor.user().username,
            msg : msg
        };

        Chats.insert(chat);
    },

    getChats : function() {
        return Chats.find({}, {sort: { creationDate: -1 }});
    }
};

if (Meteor.isClient) {
    
    Template.chat.rendered = function() {
        $.fn.pressEnter = function(fn) {  

            return this.each(function() {  
                $(this).bind('enterPress', fn);
                $(this).keyup(function(e){
                    if(e.keyCode == 13)
                    {
                      $(this).trigger("enterPress");
                    }
                })
            });  
        };

        var chatbox = $('.y-chatbox');

        chatbox.on('focusin', function(){
            this.placeholder = "";
        });


        chatbox.on('focusout', function(){            
            this.placeholder = I18N.typeHereText;
        });

        chatbox.pressEnter(function(e, a){
            var input = $(e.currentTarget);
            if (!input.val()) return ;

            ChatManager.addChat(input.val());
            input.val("");            
        });
    };




    Template.chat.events({
        'click button.y-button-chatbox' : function() {            
            var input = $('.y-chatbox');
            
            ChatManager.addChat(input.val());
            input.val("");
        }
    });

    Template.chat.helpers({
        getChats : function() {
            return ChatManager.getChats();
        }
    });
}