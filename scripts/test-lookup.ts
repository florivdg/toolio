// Test script for iTunes lookup functionality
import { lookupTrack } from '../lib/itunes/lookup'

// Example track ID from the user's example
const trackId = 1757207205

async function testLookup() {
  try {
    console.log('Looking up track ID:', trackId)
    const result = await lookupTrack(trackId)
    console.log(`Found ${result.resultCount} results.`)

    if (result.resultCount > 0) {
      const track = result.results[0]
      console.log('Track Name:', track.trackName)
      console.log('Artist:', track.artistName)
      console.log('Price:', track.trackPrice, track.currency)
      console.log('Genre:', track.primaryGenreName)
    }

    // Show full response
    console.log(JSON.stringify(result, null, 2))
  } catch (error) {
    console.error('Error looking up track:', error)
  }
}

testLookup()
