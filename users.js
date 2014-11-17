
if (Meteor.isClient) {
	Template.users.helpers({
		getAllUsers : function() {
			return Meteor.users.find({}).fetch();
		}
	});
}