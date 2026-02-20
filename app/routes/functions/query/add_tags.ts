export const addtags=`mutation addTags($id:ID!,$tags:[String!]!){
    tagsAdd(id: $id, tags: $tags) {
      node {
        id
      }
      userErrors {
        message
        field
      }
    }
  }`

