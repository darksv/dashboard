"use strict";

Chart.defaults.global.defaultFontColor = '#ccc';

String.prototype.zfill = function(width) {
    if (width > this.length) {
        return new Array(width - this.length + 1).join('0') + this;
    }
    return this;
};

Number.prototype.zfill = function(width) {
    return this.toString().zfill(width);
};

Date.prototype.addDays = function(n) {
    return new Date(this.getTime() + n * 24 * 3600 * 1000);
};

Date.prototype.toHourMinute = function() {
    return this.getHours().zfill(2) + ':' + this.getMinutes().zfill(2);
};

Array.prototype.last = function() {
    return this[this.length - 1];
};

Array.prototype.pushAndShift = function(item) {
    var shifted = this.shift();
    this.push(item);
    return shifted;
};

function hexToRgba(hex, alpha) {
    if (hex[0] == '#') {
        hex = hex.slice(1);
    }

    var r = parseInt(hex.slice(0, 2), 16),
        g = parseInt(hex.slice(2, 4), 16),
        b = parseInt(hex.slice(4, 6), 16),
        a = alpha || 1.0;

    return 'rgba(' + [r, g, b, a].join(', ') + ')';
}

function generateGuid() {
    var result = '';
    for (var j = 0; j < 32; j++) {
        if (j == 8 || j == 12|| j == 16|| j == 20)
            result += '-';
        result += Math.floor(Math.random() * 16).toString(16).toUpperCase();
    }
    return result;
}

function isValidDate(str) {
    return !isNaN(Date.parse(str));
}

const ChannelTile = Vue.component('channel-tile', {
    template: '#channel-tile',
    props: {
        channel: {
            required: true
        },
        user: {
            required: true
        }
    }
});

const ChannelsPage = Vue.component('channels-page', {
    template: '#channels-page',
    props: {
        channels: {
            required: true,
            type: Array
        },
        user: {
            required: true
        }
    },
    data: function() {
        return {
            enableSort: false,
            showDisabled: false
        }
    },
    watch: {
        channels: function (items) {
            if (!this.enableSort) {
                return;
            }

            var newOrder = items.map(function (x) {
                return x.id;
            });

            axios.post('/api/updateOrder?order=' + newOrder.join(','));
        }
    }
});

const MyChart = Vue.component('chart', {
    template: '<canvas>',
    props: {
        labels: {
            required: true,
            type: Array
        },
        values: {
            required: true,
            type: Array
        },
        title: {
            required: true,
            type: String
        },
        color: {
            required: true,
            type: String
        },
        unit: {
            required: true,
            type: String
        }
    },
    watch: {
        labels: function() {
            this.chart.data.labels = this.labels;
            this.chart.update();
        },
        values: function () {
            this.chart.data.datasets[0].data = this.values;
            this.chart.update();
        },
        title: function () {
            this.chart.options.title.text = this.title;
            this.chart.options.scales.yAxes[0].scaleLabel = {
                display: !!this.title,
                labelString: this.title + ' [' + this.unit + ']'
            };
            this.chart.update();
        },
        color: function () {
            this.chart.data.datasets[0].borderColor = hexToRgba(this.color, 0.5);
            this.chart.update();
        },
        unit: function () {
            this.chart.options.scales.yAxes[0].scaleLabel = {
                display: !!this.title,
                labelString: this.title + ' [' + this.unit + ']'
            };
            this.chart.update();
        }
    },
    mounted: function () {
        this.chart = new Chart(this.$el, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        fill: false,
                        lineTension: 0,
                        pointRadius: 0,
                        data: [],
                        borderColor: hexToRgba('#FFFFFF', 0.5),
                        borderWidth: 2.5,
                        label: ''
                    }
                ]
            },
            options: {
                animation: false,
                responsive: true,
                maintainAspectRatio: false,
                legend: {
                    display: false
                },
                scales: {
                    yAxes: [{
                        display: true
                    }]
                },
                title: {
                    display: true,
                    text: '',
                    fontSize: 24,
                    padding: 8
                }
            }
        });
    }
});

const ChannelRecentPage = Vue.component('channel-recent-page', {
    template: '#channel-recent-page',
    props: {
        channelId: {
            required: true
        }
    },
    data: function () {
        return {
            items: [],
            title: '',
            color: '',
            unit: ''
        };
    },
    computed: {
        labels: function () {
            return this.items.map(function(item) {
                return item[0];
            });
        },
        values: function () {
            return this.items.map(function(item) {
                return item[1];
            });
        }
    },
    watch: {
        channelId: function() {
            this.update();
        }
    },
    created: function () {
        this.update();
    },
    methods: {
        update: function() {
            var url = '/api/getStats?type=recent&channelId=' + this.channelId;
            var self = this;
            axios.get(url).then(function (response) {
                var data = response.data;
                self.items = [];
                for (var i = 0; i < data.labels.length; ++i) {
                    self.add(data.labels[i], data.values[i], true);
                }
                self.color = data.color;
                self.title = data.title;
                self.unit = data.unit;
            });
        },
        add: function(label, value, ignoreDuplicatedLabel) {
            if (this.items.length > 0 && this.items.last()[0] === label && ignoreDuplicatedLabel === true){
                return;
            }

            this.items.push([label, value]);
        }
    }
});

const ChannelCustomPage = Vue.component('channel-custom-page', {
    template: '#channel-custom-page',
    data: function () {
        return {
            items: [],
            title: '',
            color: '',
            unit: '',
            from: '',
            to: '',
            fieldsEnabled: true,
            fieldsShown: false
        };
    },
    props: {
        channelId: {
            required: true
        }
    },
    computed: {
        formattedFrom: function () {
            return this.from.replace(/-/g, '') + '0000';
        },
        formattedTo: function () {
            return this.to.replace(/-/g, '') + '2359';
        },
        labels: function () {
            return this.items.map(function(item) {
                return item[0];
            });
        },
        values: function () {
            return this.items.map(function(item) {
                return item[1];
            });
        }
    },
    watch: {
        channelId: function() {
            this.update();
        }
    },
    created: function () {
        var dateFrom, dateTo;

        if (isValidDate(this.$route.query.from) && isValidDate(this.$route.query.to)) {
            dateFrom = new Date(this.$route.query.from);
            dateTo = new Date(this.$route.query.to);
        } else {
            dateFrom = (new Date).addDays(-30);
            dateTo = (new Date);
        }

        this.from = dateFrom.toISOString().substr(0, 10);
        this.to = dateTo.toISOString().substr(0, 10);
        this.show();
    },
    methods: {
        update: function() {
            var url = '/api/getStats?channelId=' + this.channelId + '&type=custom&from=' + this.formattedFrom + '&to=' + this.formattedTo;
            var self = this;
            self.fieldsEnabled = false;
            axios.get(url).then(function (response) {
                var data = response.data;
                self.items = [];
                for (var i = 0; i < data.labels.length; ++i) {
                    self.items.push([data.labels[i], data.values[i]]);
                }
                self.color = '#FFFFFF';
                self.title = data.title;
                self.unit = data.unit;
                self.fieldsEnabled = true;
            });
        },
        show: function () {
            this.$router.push({
                name: 'channel_custom',
                query: {
                    from: this.from,
                    to: this.to
                }
            });
            this.update();
        },
        toggleFields: function () {
            this.fieldsShown = !this.fieldsShown;
        }
    }
});

const router = new VueRouter({
    routes: [
        { path: '/', component: ChannelsPage, name: 'home' },
        { path: '/channel/:channelId/recent', component: ChannelRecentPage, name: 'channel_recent', props: true },
        { path: '/channel/:channelId/custom', component: ChannelCustomPage, name: 'channel_custom', props: true }
    ]
});

const app = new Vue({
    el: '#app',
    data: {
        channels: [],
        connected: false,
        user: {}
    },
    computed: {
        isLogged: function() {
            return this.user.name !== undefined;
        }
    },
    created: function() {
        var self = this;
        axios.get('/api/channels').then(function (response) {
            self.channels = response.data.channels;
        });
        axios.get('/api/session').then(function (response) {
           self.user = response.data.user;
        });
    },
    router: router
});

function channelUpdate(channel, newValue) {
    switch (app.$route.name)
    {
        case 'home':
            var oldValue = channel.value;
            channel.value = newValue;
            channel.value_updated = new Date().toISOString();
            channel.change = Math.sign(newValue - oldValue);
            break;

        case 'channel_recent':
            if (parseInt(app.$route.params.channelId) === channel.id) {
                var label = new Date().toHourMinute();
                var currentView = app.$children[0];
                if (currentView.add !== undefined) {
                    currentView.add(label, newValue, true);
                }
            }
            break;
    }
}

// MQTT Client
var clientId = generateGuid();

var client = new Paho.MQTT.Client('wss://' + window.location.host + ':9883/ws', clientId);
client.onConnectionLost = function (response) {
    console.log(response);
    app.connected = false
};

client.onMessageArrived = function (message) {
    var topic = message.destinationName;
    var payload = message.payloadString;

    var channelUuid = topic.split('/')[1];
    var newValue = parseFloat(payload);

    // temporary fix for invalid negative values
    if (newValue > 4000) {
        newValue -= 4096;
    }

    var channel = app.channels.find(function(channel) {
        return channelUuid === channel.uuid;
    });

    if (channel === null) {
        return;
    }

    channelUpdate(channel, newValue);
};

client.connect({
    onSuccess: function() {
        client.subscribe('+/+');
        client.subscribe('notify/+');
        app.connected = true;
    }
});
