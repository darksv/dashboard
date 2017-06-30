import math
import traceback
from urllib.parse import urlencode
import paho.mqtt.client as mqtt
import requests
import config


def on_connect(client, userdata, flags, rc):
    print('Connected (status={0})'.format(rc))

    client.subscribe('#')


def parse_value(val: str) -> float:
    result = float(val)
    if math.isnan(result) or math.isinf(result):
        raise ValueError('Only finite float is a valid value (got {0})'.format(result))

    return result


def process_watchers(channel_id, value, client):
    data = requests.get(config.DASHBOARD_URL + '/api/channel/{}/watchers'.format(channel_id)).json()

    users_to_notify = set()
    for watcher in data['watchers']:
        condition = watcher['condition']
        watcher_id = watcher['id']
        user_id = watcher['user_id']
        message = watcher['message']

        if eval(condition, dict(), dict(value=value)):
            notification = dict(
                message=message.replace('value', str(value)),
                watcher_id=watcher_id,
                user_id=user_id,
            )
            requests.post(config.DASHBOARD_URL + '/api/notification?' + urlencode(notification))
            users_to_notify.add(user_id)

    for user_id in users_to_notify:
        client.publish('notify/{0}'.format(user_id), '', 2)


def on_message(client, userdata, msg):
    # noinspection PyBroadException
    try:
        device_uuid, channel_uuid = msg.topic.split('/')
        value = parse_value(msg.payload.decode('ascii'))

        # quick fix for DS18B20 driver error for negative temperatures
        if value > 4000:
            value -= 4096

        print('Received channel update: device={0} channel={1} value={2}'.format(device_uuid, channel_uuid, value))

        response = requests.get(config.DASHBOARD_URL + '/updateChannel', dict(
            deviceUuid=device_uuid,
            channelUuid=channel_uuid,
            value=value
        ))

        if response.status_code != 200:
            print('Update unsuccessful', response.status_code, response.content)
            return

        channel_id = int(response.content)
        process_watchers(channel_id, value, client)

    except:
        print('Exception occurred when processing message (topic={0}, payload={1})'.format(msg.topic, msg.payload))
        print(traceback.format_exc())


def main():
    # noinspection PyBroadException
    try:
        client = mqtt.Client()
        client.on_connect = on_connect
        client.on_message = on_message
        client.connect(config.MQTT_HOST, config.MQTT_PORT, 60)
        client.loop_forever()
    except:
        print(traceback.format_exc())

if __name__ == '__main__':
    main()
