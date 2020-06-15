import { Room } from 'wechaty'

export async function getMentionText (
  contactIdList : string[],
  room          : Room,
): Promise<string> {
  const uniqIdList = [...new Set([...contactIdList])]

  const contactList = uniqIdList.map(
    id => room.wechaty.Contact.load(id)
  )
  await Promise.all(
    contactList.map(c => c.ready())
  )

  const contactNameList = contactList.map(c => c.name())
  const roomAliasListFuture = contactList.map(c => room.alias(c))
  const roomAliasList = await Promise.all(roomAliasListFuture)

  const mentionList = contactNameList.map(
    (name, i) => roomAliasList[i] ? roomAliasList[i] : name
  )
  const mentionText = '@' + mentionList.join(' @')
  return mentionText
}
