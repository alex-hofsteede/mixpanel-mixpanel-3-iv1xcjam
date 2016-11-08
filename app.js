import 'mixpanel-common';
import moment from 'moment';
import _ from 'lodash';

import { Component } from 'panel';
import counterTemplate from './app.jade';

import './app.styl';

const objToQueryString = params => {
  return Object.keys(params).map(k => [k, encodeURIComponent(params[k])].join('=')).join('&');
}

const API = {
  get: (endpoint, params = {}, secret) => {
    return fetch('https://mixpanel.com/api/2.0/' + endpoint + '?' + objToQueryString(params), {
      headers: {
        'Authorization': 'Basic ' + btoa(secret),
      },
      method: 'GET',
    })
    .then(response => {
      if (response.status < 400 || response.body) {
        return response.json();
      } else {
        return {error: response.statusText};
      }
    })
  },
};

document.registerElement('quixpanel-app', class extends Component {
  get config() {
    return {
      defaultState: {
        apiSecret: '',
        queryType: 'segmentation',
        bucketMode: false,
        buckets: [['', ''], ['', '']],
        segmentation: {
          event: '',
        },
        funnels: {
          steps: [{event: '', selector: undefined}, {event: '', selector: undefined}],
        },
        where: '',
        on: '',
        from_date: '2012-01-01',
        to_date: moment().format('YYYY-MM-DD'),
        unit: 'month',
        type: 'unique',
      },

      helpers: {
        runQuery: () => this.executeQuery(true),
        apiSecretChanged: e => {
          this.update({apiSecret: document.querySelector('#apiSecretInput').value});
          this.executeQuery();
        },
        queryTypeChanged: e => {
          this.update({queryType: e.target.value});
        },
        fromDateChanged: e => {
          this.update({from_date: document.querySelector('#fromDateInput').value});
          this.executeQuery();
        },
        toDateChanged: e => {
          this.update({to_date: document.querySelector('#toDateInput').value});
          this.executeQuery();
        },
        unitChanged: e => {
          this.update({unit: document.querySelector('#unitInput').value});
          this.executeQuery();
        },
        segmentationEventChanged: e => {
          this.state.segmentation.event = document.querySelector('#eventInput').value;
          this.update();
          this.executeQuery();
        },
        funnelsEventChanged: e => {
          const idx = e.target.getAttribute('idx');
          this.state.funnels.steps[idx].event = e.target.value;
          this.update();
          this.executeQuery();
        },
        funnelsFilterChanged: e => {
          const idx = e.target.getAttribute('idx');
          this.state.funnels.steps[idx].selector = e.target.value;
          this.update();
          this.executeQuery();
        },
        filterChanged: e => {
          this.update({where: document.querySelector('#filterInput').value});
          this.executeQuery();
        },
        segmentChanged: e => {
          this.update({on: document.querySelector('#segmentInput').value});
          this.executeQuery();
        },
        bucketChanged: e => {
          const buckets = [];
          const bucketRows = Array.from(document.querySelectorAll('.bucket-row'));
          const elseRow = bucketRows.pop();
          const elseVal = elseRow.querySelector('.bucket-val-input').value;
          buckets.push([null, elseVal]);

          const parseRow = row => [row.querySelector('.bucket-expr-input').value, row.querySelector('.bucket-val-input').value];
          let [expr, val] = parseRow(bucketRows.pop());
          buckets.unshift([expr, val]);

          let on;
          if (elseVal.includes("user[") || elseVal.includes("properties[")) {
            on = `if (${expr}, "${val}", ${elseVal})`;
          } else {
            on = `if (${expr}, "${val}", "${elseVal}")`;
          }

          while (bucketRows.length) {
            [expr, val] = parseRow(bucketRows.pop());
            buckets.unshift([expr, val]);
            on = `if (${expr}, "${val}", ${on})`;
          }
          this.update({buckets, on});
          this.executeQuery();
        },
        bucketMode: () => {
          this.update({bucketMode: true});
        },
        segmentMode: () => {
          this.update({bucketMode: false});
        },
        addBucket: () => {
          this.state.buckets.splice(this.state.buckets.length - 1, 0, ['', '']);
          this.update();
        },
        removeBucket: e => {
          const idx = e.currentTarget.dataset.idx;
          this.state.buckets.splice(idx, 1);
          this.update();
        },
        errorAlertChange: e => {
          if (e.detail.state === 'closed') {
            this.update({error: null})
          }
        }
      },

      template: counterTemplate,
    };
  }

  update() {
    super.update(...arguments);
    const state = Object.assign({}, this.state);
    delete state.apiSecret;
    const jsonState = JSON.stringify(state);
    window.localStorage.setItem('quixpanelState', jsonState);
    window.location.hash = encodeURIComponent(jsonState);

  }

  executeQuery(immediate=false) {
    if (!immediate) {
      clearTimeout(this.queryTimeout);
      this.queryTimeout = setTimeout(() => {
        this.executeQuery(true);
      }, 1000)
      return;
    }

    switch(this.state.queryType) {
      case 'segmentation':
        API.get('segmentation', {
          event: this.state.segmentation.event,
          type: this.state.type,
          on: this.state.on,
          where: this.state.where,
          from_date: this.state.from_date,
          to_date: this.state.to_date,
          unit: this.state.unit,
        }, this.state.apiSecret)
        .then(response => {
          if (response.error) {
            this.update({error: response.error});
            return;
          }
          var vals = response.data.values;
          this.renderChart(this.formatData(vals));
        });
        break;
     case 'funnels':
      this.state.funnels.steps.forEach(step => {
        if (!step.selector) {
          delete step.selector;
        }
      });
      debugger;
      API.get('arb_funnels', {
        events: JSON.stringify(this.state.funnels.steps),
        on: this.state.on,
        where: this.state.where,
        from_date: this.state.from_date,
        to_date: this.state.to_date,
        unit: this.state.unit,
      }, this.state.apiSecret)
      .then(response => {
        if (response.error) {
          this.update({error: response.error});
          return;
        }
        var vals = {};
        for (const date in response.data) {
          let dateVals = response.data[date];
          if (dateVals.analysis && dateVals.steps) { // not segmented
            dateVals = {'Conversion rate': dateVals.steps};
          }
          for (const segment in dateVals) {
            if (segment !== '$overall') {
              const numSteps = dateVals[segment].length;
              vals[segment] = vals[segment] || {};
              vals[segment][date] = dateVals[segment][numSteps - 1].overall_conv_ratio;
            }
          }
        }
        this.renderChart(this.formatData(vals));
      });

        break;
    }
  }

  formatData(vals) {
    const COLORS = ['#a6cee3','#1f78b4','#b2df8a','#33a02c','#fb9a99','#e31a1c','#fdbf6f','#ff7f00','#cab2d6','#6a3d9a'];
    var data = [];
    var i = 0;
    for (var segment in vals) {
      i++;
      var values = Object.keys(vals[segment]).map(date => {
        return {
          x: new Date(date),
          y: vals[segment][date],
        }
      });
      values.sort((a, b) => a.x - b.x);
      data.push({
        values: values,
        key: segment,
        color: COLORS[i % COLORS.length],
      })
    }
    return data;
  }

  renderChart(data) {
      var chart;
      nv.addGraph(() => {
        chart = nv.models.lineChart()
            .options({
                duration: 300,
                useInteractiveGuideline: true
            });
        chart.xAxis
            .axisLabel("Date")
            .tickFormat(function(d) { return d3.time.format('%m/%Y')(new Date(d)); });
        chart.yAxis
            .axisLabel('Event count')
            .tickFormat(function(d) {
                if (d == null) {
                    return 'N/A';
                }
                return d3.format(',.2f')(d);
            });

        this.chartData = this.chartData || d3.select('#chart').append('svg').datum(data);

        this.chartData
            .datum(data)
            .call(chart);

        nv.utils.windowResize(chart.update);

        return chart;
    });
  }

  start(apiSecret) {
    this.update({apiSecret: apiSecret});
  }

});

const app = document.createElement('quixpanel-app');

// load existing app state from localStorage or URL
let state = {};
if (window.location.hash) {
  state = JSON.parse(decodeURIComponent(window.location.hash.substring(1)));
} else if (localStorage.getItem('quixpanelState')) {
  state = JSON.parse(localStorage.getItem('quixpanelState') || '{}');
}
if (!state.funnels || !state.funnels.steps) {
  state = {};
}
app.state = Object.assign(app.state, state);

function queryParam(name) {
    const url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    const regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}
document.body.appendChild(app);

if (queryParam('apiSecret')) {
  app.start(queryParam('apiSecret'));
} else {
  const secretTimeout = setTimeout(() => {
    app.update({error: 'Please provide your API secret'});
  }, 5000);

  window.onmessage = _.bind(function(message) {
    if (_.isString(message.data.api_secret)) {
      clearTimeout(secretTimeout);
      app.start(message.data.api_secret);
    }
  }, this);
}

