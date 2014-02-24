module.exports = stripQuotes

function stripQuotes(string) {
  var tail = string.charAt(string.length - 1)
  var head = string.charAt(0)

  if (
    tail === '"' ||
    tail === "'" ||
    head === '"' ||
    head === "'"
  ) string = string.replace(/^['"]|["']$/g, '')

  return string
}
