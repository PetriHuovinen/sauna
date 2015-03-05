Meteor.publish('temperatures', function() {
  var last24h = moment().subtract(24, 'hours').valueOf();
//  var lämmöt = Temperatures.find({ logged : { $gte: last24h }}).fetch();
//  console.log(lämmöt);
  return Temperatures.find({ logged : { $gte: last24h }});
});

Meteor.publish('latestTemperature', function() {
  return LatestTemperature.find();
});

// Lue saunan lämpötilatieto tiedostosta kerran 20 sek
// ja lisää lukema tietokantaan
// Ei lueta eikä lisätä, vaan tän hoitaa sauna.sh
/*Meteor.setInterval(function() {
  var temperature = Assets.getText('temperature.txt');
  temperature = temperature.slice(0,-1);
  console.log('luettu lämpötila: ' + temperature);
  Temperatures.insert({ temperature : temperature, logged : Date.now() });
}, 20000);
*/