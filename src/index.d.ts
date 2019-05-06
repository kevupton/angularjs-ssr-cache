declare module '*.json' {
  const jsonObject : {
    [key : string] : any;
  }
  
  export default jsonObject;
}
