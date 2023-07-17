@protocol : 'rest'
service ClientLinkDataXchange @(path : 'restapi') {
    type Data {
        ![root-entity-id] : String;
        ![entity-id]      : String;
        Changes           : many {
            node          : String;
            nodeID        : String;
            ParentNodeID  : String;
            Modification  : String;
            ChangedBy     : String;
            ChangedFields : many {
                Fieldname : String;
                New       : String;
                Old       : String;
            }
        }
    }

    type JsonMessage {}
    action EnrichData(specversion : String, type : String, source : String, id : String, ![event-type] : String, ![event-type-version] : String, ![event-id] : String, ![event-time] : String, data : Data)           returns JsonMessage;
    action VerifyEventPayload(specversion : String, type : String, source : String, id : String, ![event-type] : String, ![event-type-version] : String, ![event-id] : String, ![event-time] : String, data : Data)   returns JsonMessage;
    action EnrichDataAndPublish(specversion : String, type : String, source : String, id : String, ![event-type] : String, ![event-type-version] : String, ![event-id] : String, ![event-time] : String, data : Data) returns JsonMessage;
}

annotate ClientLinkDataXchange.EnrichData with @(requires : 'system-user');
annotate ClientLinkDataXchange.EnrichDataAndPublish with @(requires : 'system-user');
