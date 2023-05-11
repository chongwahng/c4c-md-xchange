class messagePayload {
    static initialize() {
        let outboundMessagePayload = {
            EventName: '',
            EventType: '',
            EventTriggeredOn: '',
            EventSpecInfo: {
                TopicStrings: [],
                OriginalEventName: ''
            },
            Entity: {}
        }

        return outboundMessagePayload
    }
}

module.exports = { messagePayload }