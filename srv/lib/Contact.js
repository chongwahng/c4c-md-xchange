const { errorHandler } = require('./ErrorHandler')
const { messagePayload } = require('./ContactMessage')

const { executeHttpRequest, getDestination } = require('@sap-cloud-sdk/core')

class Contact {
    static async run(eventObj, destinationName, targetEventType, targetEventName, targetObjectName, exceptionTargetObj) {
        const placeHolder = '_'
        let contactFilter = ''
        let response = ''
        let apiURL = ''

        let outboundMessagePayload = messagePayload.initialize()

        // BusinessPartnerRelationship.Root.Deleted event does not have any key reference to any collection, we can only send back the deleted object id
        if (eventObj['event-type'] === 'BusinessPartnerRelationship.Root.Deleted') {
            outboundMessagePayload.EventName = targetEventName
            outboundMessagePayload.EventType = targetEventType
            outboundMessagePayload.ObjectName = targetObjectName
            outboundMessagePayload.EventTriggeredOn = eventObj['event-time']
            outboundMessagePayload.Entity.BusinessPartnerRelationshipDeletion = eventObj.data['root-entity-id']
            outboundMessagePayload.EventSpecInfo.OriginalEventName = eventObj['event-type']

            outboundMessagePayload.EventSpecInfo.TopicStrings.push(`sg/contact/v1/${placeHolder}`)
            outboundMessagePayload.EventSpecInfo.TopicStrings.push(`ppginc/contact/v1/${placeHolder}`)

            return outboundMessagePayload
        } else {
            try {
                const destination = await getDestination(destinationName)

                // when main event is triggered for BusinessPartnerRelationhip.Root, we need to look backward for ContactID and use it as filter for ContactCollection
                if (eventObj['event-type'] === 'BusinessPartnerRelationship.Root.Created' || eventObj['event-type'] === 'BusinessPartnerRelationship.Root.Updated') {
                    apiURL =
                        `/sap/c4c/odata/v1/c4codataapi/BusinessPartnerRelationshipCollection('${eventObj.data['root-entity-id']}')?` +
                        `$select=SecondBusinessPartnerID`

                    response = await executeHttpRequest(
                        destination,
                        {
                            method: 'get',
                            url: apiURL
                        }
                    )

                    contactFilter = `ContactID eq '${response.data.d.results.SecondBusinessPartnerID}'`
                } else {
                    contactFilter = `ObjectID eq '${eventObj.data['root-entity-id']}'`
                }

                const contactProperties =
                    `AccountID,` +
                    `ContactID,` +
                    `FirstName,` +
                    `LastName,` +
                    `Email,` +
                    `Phone,` +
                    `Ecommerceenabled_KUT,` +
                    `StatusCodeText,` +
                    `MaximumOrderAmountContent_KUT,` +
                    `MaximumOrderAmountcurrencyCode_KUT,` +
                    `BusinessAddressCountryCode`

                const bpRelationshipProperties =
                    `ObjectID,` +
                    `FirstBusinessPartnerID,` +
                    `SecondBusinessPartnerID,` +
                    `RelationshipType`

                apiURL =
                    `/sap/c4c/odata/v1/c4codataapi/ContactCollection?` +
                    `$filter=${contactFilter}` +
                    `&$select=${contactProperties}`

                response = await executeHttpRequest(
                    destination,
                    {
                        method: 'get',
                        url: apiURL
                    }
                )

                if (response.data.d.results.length > 0) {
                    const contactCollection = response.data.d.results[0]

                    // topic determination logic goes here
                    let countryCode = (contactCollection.BusinessAddressCountryCode === '') ? placeHolder : contactCollection.BusinessAddressCountryCode

                    outboundMessagePayload.EventSpecInfo.OriginalEventName = eventObj['event-type']
                    outboundMessagePayload.EventSpecInfo.TopicStrings.push(`ppginc/contact/v1/${countryCode}`)

                    if (
                        (
                            contactCollection.Ecommerceenabled_KUT === '101' ||
                            contactCollection.Ecommerceenabled_KUT === '121' ||
                            contactCollection.Ecommerceenabled_KUT === '131'
                        ) &&
                        (
                            contactCollection.BusinessAddressCountryCode === 'NL' ||
                            contactCollection.BusinessAddressCountryCode === 'FR' ||
                            contactCollection.BusinessAddressCountryCode === 'CZ' ||
                            contactCollection.BusinessAddressCountryCode === 'SK' ||
                            contactCollection.BusinessAddressCountryCode === 'GB')
                    ) {
                        outboundMessagePayload.EventSpecInfo.TopicStrings.push(`sg/contact/v1/${countryCode}`)
                    }

                    outboundMessagePayload.EventName = targetEventName
                    outboundMessagePayload.EventType = targetEventType
                    outboundMessagePayload.ObjectName = targetObjectName
                    outboundMessagePayload.EventTriggeredOn = eventObj['event-time']

                    outboundMessagePayload.Entity.AccountId = contactCollection.AccountID
                    outboundMessagePayload.Entity.ContactCode = contactCollection.ContactID
                    outboundMessagePayload.Entity.FirstName = contactCollection.FirstName
                    outboundMessagePayload.Entity.LastName = contactCollection.LastName
                    outboundMessagePayload.Entity.Email = contactCollection.Email
                    outboundMessagePayload.Entity.Phone = contactCollection.Phone
                    outboundMessagePayload.Entity.Type = contactCollection.Ecommerceenabled_KUT
                    outboundMessagePayload.Entity.Status = contactCollection.StatusCodeText
                    outboundMessagePayload.Entity.MaximumOrderAmount = contactCollection.MaximumOrderAmountContent_KUT
                    outboundMessagePayload.Entity.MaximumOrderAmountCurrencyCode = contactCollection.MaximumOrderAmountcurrencyCode_KUT
                    outboundMessagePayload.Entity.CountryCode = contactCollection.BusinessAddressCountryCode

                    let bpFilter =
                        `SecondBusinessPartnerID eq '${contactCollection.ContactID}' and ` +
                        `(RelationshipType eq 'Z27' or RelationshipType eq 'BUR001')`

                    apiURL =
                        `/sap/c4c/odata/v1/c4codataapi/BusinessPartnerRelationshipCollection?` +
                        `$filter=${bpFilter}` +
                        `&$select=${bpRelationshipProperties}`

                    response = await executeHttpRequest(
                        destination,
                        {
                            method: 'get',
                            url: apiURL
                        }
                    )

                    if (response.data.d.results.length > 0) {
                        for (let partner of response.data.d.results.entries()) {
                            switch (partner[1].RelationshipType) {
                                case 'Z27':
                                    outboundMessagePayload.Entity.ApproveOrderFor.push({ ContactId: partner[1].FirstBusinessPartnerID, ObjectId: partner[1].ObjectID })
                                    break
                                case 'BUR001':
                                    outboundMessagePayload.Entity.ListOfAccount.push({ ContactId: partner[1].FirstBusinessPartnerID, ObjectId: partner[1].ObjectID })
                                    break
                            }
                        }
                    }
                } else {
                    outboundMessagePayload = exceptionTargetObj
                }

                return outboundMessagePayload
            }
            catch (err) {
                errorHandler.print(err)
            }
        }
    }
}

module.exports = { Contact }