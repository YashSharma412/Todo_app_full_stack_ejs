const validateTodoData = ({title, description})=>{
    // console.log(title, description)
    return new Promise((resolve, reject)=>{
        if(!title) reject("Missing title, please check and try again")
        // if(!description) reject("Missing description, please check and try again")
        
        if(typeof title !== 'string')
            reject("Invalid title type, Title is not a string, please check and try again")
        
        if(description && typeof description !== 'string')
            reject("Invalid description type, Description is not a string, please check and try again")

        if(title.length < 3)
            reject("Invalid title length, Title should be at least 3 characters long, please check and try again")
        
        if(title.length > 100)
            reject("Invalid title length, Title should be at most 100 characters long, please check and try again")        

        if(description && description.length > 1000)
            reject("Invalid description length, Description should be at most 1000 characters long, please check and try again")

        resolve()
    })
}

module.exports = validateTodoData;