/**
 * This regular expression is used to validate UUIDs (Universally Unique Identifiers) 
 * in the format of 8-4-4-4-12 hexadecimal characters. It ensures that the UUID is in 
 * the correct format and adheres to the standard structure.
 */
export const ID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
