const { errorHandler } = require('./ErrorHandler')
const { messagePayload } = require('./ContactMessage')

const { executeHttpRequest, getDestination } = require('@sap-cloud-sdk/core')

class Contact {
    static async run(eventObj, destinationName, targetEventType, targetEventName, exceptionTargetObj) {
        const placeHolder = '_'

        let objectID = ''
        let response = ''
        let apiURL = ''

        let outboundMessagePayload = messagePayload.initialize()

        try {
            const destination = await getDestination(destinationName)

            objectID = eventObj.data['root-entity-id']

            const contactProperties =
                `AccountID,` +
                `ContactID,` +
                `FirstName,` +
                `LastName,` +
                `Email,` +
                `Phone,` +
                `Ecommerceenabled_KUT,` +
                `MaximumOrderAmountContent_KUT,` +
                `MaximumOrderAmountcurrencyCode_KUT`

            const accountProperties = `CorporateAccount/CountryCode`

            const bpRelationshipProperties =
                `ObjectID,` +
                `FirstBusinessPartnerID,` +
                `SecondBusinessPartnerID,` +
                `RelationshipType`

            apiURL =
                `/sap/c4c/odata/v1/c4codataapi/ContactCollection?` +
                `$expand=` +
                `CorporateAccount` +
                `&$filter=ObjectID eq '${objectID}'` +
                `&$select=${contactProperties},${accountProperties}`

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
                const account = contactCollection.CorporateAccount
                if (
                    (
                        contactCollection.Ecommerceenabled_KUT === '101' ||
                        contactCollection.Ecommerceenabled_KUT === '121' ||
                        contactCollection.Ecommerceenabled_KUT === '131'
                    ) &&
                    (
                        account.CountryCode === 'NL' ||
                        account.CountryCode === 'FR' ||
                        account.CountryCode === 'CZ' ||
                        account.CountryCode === 'SK' ||
                        account.CountryCode === 'GB')
                ) {

                }

                outboundMessagePayload.EventName = targetEventName
                outboundMessagePayload.EventType = targetEventType
                outboundMessagePayload.EventTriggeredOn = eventObj['event-time']

                outboundMessagePayload.Entity.AccountId = contactCollection.AccountID
                outboundMessagePayload.Entity.ContactCode = contactCollection.ContactID
                outboundMessagePayload.Entity.FirstName = contactCollection.FirstName
                outboundMessagePayload.Entity.LastName = contactCollection.LastName
                outboundMessagePayload.Entity.Email = contactCollection.Email
                outboundMessagePayload.Entity.Phone = contactCollection.Phone
                outboundMessagePayload.Entity.Type = contactCollection.Ecommerceenabled_KUT
                outboundMessagePayload.Entity.MaximumOrderAmount = contactCollection.MaximumOrderAmountContent_KUT
                outboundMessagePayload.Entity.MaximumOrderAmountCurrencyCode = contactCollection.MaximumOrderAmountcurrencyCode_KUT

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

module.exports = { Contact }