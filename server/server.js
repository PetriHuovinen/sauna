var fs = Npm.require('fs');
var os = Npm.require('os');
var path = Npm.require('path');

var file = path.join('/var/www/sauna/', 'temperature.json');

Meteor.methods({
  last24h : function() {
    return koosta24h();
  },
  latest : function() {
    return LatestTemperature.findOne();
  },
  last7days : function() {
    return last7days();
  },
  last30days : function() {
    return last30days();
  }
});

get10LatestTemperatures = function() {
  var last20measurements = moment().subtract(20, 'minutes').valueOf();
  var lämmöt = Temperatures.find({
    logged : {
      $gte : last20measurements
    }
  }, {
    sort : {
      logged : -1
    }
  }).fetch();
  
  temperatures = lämmöt.slice(0,10);
}

var temperatures = [];

saveTemperatureToFile = function(trendi) {
  fs.writeFile(file, JSON.stringify(trendi), 'utf8', function(err) {
    if ( err ) {
      console.log('virhe tiedostoa tallennettaessa! ' + err);
    } else {
      console.log('lämpötilatiedot tallennettu tiedostoon.');
    }
  });
}

Meteor.startup(function() {
  var last20measurements = moment().subtract(20, 'minutes').valueOf();
  var lämmöt = Temperatures.find({
    logged : {
      $gte : last20measurements
    }
  }, {
    sort : {
      logged : -1
    }
  }).fetch();
  temperatures = lämmöt.slice(0,10);
  var trendi = trend(temperatures);
  Trend.remove({});
  Trend.insert(trendi);
  saveTemperatureToFile(trendi);
});

LatestTemperature.find().observe({
  changed : function(temp) {
    if ( temperatures.length == 10 ) {
      temperatures.unshift(temp);
      temperatures.pop();
    }
    
    var trendi = trend(temperatures);
    Trend.remove({});
    Trend.insert(trendi);
    saveTemperatureToFile(trendi);
  }
});



trend = function(last10temperatures) {
  var first = last10temperatures[0];
  if (last10temperatures.length > 9) {
    var last = last10temperatures[9];
    if (first && last) {
      if (first.temperature < last.temperature) {
        return { trend : "laskeva", saunaReadyInMinutes : null, currentTemperature : first.temperature, logged : first.logged};
      } else if (first.temperature > last.temperature) {
        // lasketaan vielä milloin saunassa on +70 astetta
        // lämpötila nousee noin 5,5 astetta 9min aikana.
        // minuutissa nousua tapahtuu noin 0,6 astetta.
        var aika = 0;
        if (first.temperature < 70) {
          var erotus = 70 - first.temperature;
          aika = parseInt(erotus / 0.6);
        }
        return { trend : "nouseva", saunaReadyInMinutes : aika, currentTemperature : first.temperature, logged : first.logged};
      } else {
        return { trend :"tasainen", saunaReadyInMinutes : null, currentTemperature : first.temperature, logged : first.logged};
      }
    }
  }
}

koosta24h = function() {
  var last24h = moment().subtract(24, 'hours').valueOf();
  var lämmöt = Temperatures.find({
    logged : {
      $gte : last24h
    }
  }, {
    sort : {
      logged : -1
    }
  }).fetch();
  return lämmöt;
}

last7days = function() {
  var last7days = moment().subtract(7, 'days').valueOf();
  var lämmöt = Temperatures.find({
    logged : {
      $gte : last7days
    }
  }, {
    sort : {
      logged : -1
    }
  }).fetch();
  return lämmöt;
}

last30days = function() {
  var last30days = moment().subtract(30, 'days').valueOf();
  var lämmöt = Temperatures.find({
    logged : {
      $gte : last30days
    }
  }, {
    sort : {
      logged : -1
    }
  }).fetch();
  return lämmöt;
}

Meteor.publish('latestTemperature', function() {
  return LatestTemperature.find();
});

