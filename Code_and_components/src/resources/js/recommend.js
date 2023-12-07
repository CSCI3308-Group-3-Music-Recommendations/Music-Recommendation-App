const axios = require(axios)

async function recommendSong()
{
    console.log("clicked button");
    let track = document.getElementById('track-name')
    let artist = document.getElementById('artist-name')
    const url = `http://ws.audioscrobbler.com/2.0/?method=track.getsimilar&artist=${artist}&track=${track}&api_key=${LAST_FM_API_KEY}&format=json`
    await axios.get(url)
        .then(response =>{
            const similarTracks = response.data.similartracks.track;
            displaySimilarSongs(similarTracks)
        })
        .catch(error =>{
            console.error(error)
        })
}

async function displaySimilarSongs(similarTracks)
{
    let results = document.createElement('div')
    results.className('container')

    let table = document.createElement('table')
    table.className('table')
    results.appendChild(table)

    let tableHead = document.createElement('thead')
    table.appendChild(tableHead)


    let tableHeadName = document.createElement('th')
    tableHeadName.innerHTML = 'Track Name'
    tableHead.appendChild(tableHeadName)

    let tableHeadArtist = document.createElement('th')
    tableHeadArtist.innerHTML = 'Artist Name'
    tableHead.appendChild(tableHeadName)

    let tableHeadImage = document.createElement('th')
    tableHeadImage.innerHTML = ''
    tableHead.appendChild(tableHeadName)


    similarTracks.forEach(function(track)
    {
        let trackRow = document.createElement('tr')

        let trackName = document.createElement('td')
        trackRow.appendChild(trackName)
        trackName.innerHTML = track.name


        let trackArtist = document.createElement('td')
        trackRow.appendChild(trackArtist)
        trackArtist.innerHTML = track.artist.name


        let trackImageCol = document.createElement('td')
        let trackImage = document.createElement('img')
        trackImage.setAttribute('src', track.image)

        trackImageCol.appendChild(trackImage)
        trackRow.appendChild(trackImageCol)

        table.appendChild(trackRow) 
    })

}

$(document).ready(function(){
    $('[data-toggle="popover"]').popover();   
});