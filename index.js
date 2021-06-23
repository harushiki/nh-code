const Discord = require('discord.js');
const client = new Discord.Client();
const NanaAPI = require('nana-api');
const { DateTime } = require('luxon');
const nana = new NanaAPI();
const { API, } = require('nhentai-api');
const api = new API();
const pagination = require('discord.js-pagination');

client.on('ready', () => {
    client.user.setActivity("nhs code for search, nhr code for read, nhp code page for quick panel access and nhf for sauce finding.")
});

const prefix = "nhs"
const prefix2 = "nhr"
const prefix3 = "nhp"
const prefix4 = "nhf"
const saucenaoApiKey = "6e213c911ee805ad29198abb6fcb543f0ea75f60"

const sagiri = require('sagiri')
const isImageUrl = require('is-image-url')
const path = require('path')
const notSupportedExts = new Set(['gif'])
const sagi_client = sagiri(saucenaoApiKey);

client.on('message', message => {

    if (message.author.bot) return;

    const _prefix = message.content.slice(0, 3)

    const args = message.content.slice(_prefix.length).trim().split(/ +/);

    switch (_prefix) {
        case prefix:
            try{

                let bookData = {
                    tags: [],
                    artist: [],
                    parody: [],
                    group: [],
                };

                nana
                    .g(parseInt(args[0]))
                    .then((globalRes) => {
                        globalRes.tags.map((type) => {
                            switch (type.type) {
                                case 'tag':
                                    bookData.tags.push(type.name);
                                    break;
                                case 'artist':
                                    bookData.artist.push(type.name);
                                    break;
                                case 'parody':
                                    bookData.parody.push(type.name);
                                    break;
                                case 'group':
                                    bookData.group.push(type.name);
                                    break;
                                default:
                                    null;
                            }
                        });
                        return Promise.resolve(globalRes);
                    })
                    .then((globalRes) => {
                        const embed = new Discord.MessageEmbed()
                            .setColor('#ED2553')
                            .setThumbnail(
                                //TODO: Make available changes between jpg & png
                                `https://t.nhentai.net/galleries/${globalRes.media_id}/cover.jpg`
                            )
                            .setTitle(globalRes.title.pretty)
                            .setURL(`https://nhentai.net/g/${globalRes.id}`)
                            .addFields(
                                {
                                    name: 'Artist:',
                                    value: bookData.artist.length
                                        ? bookData.artist.join(', ')
                                        : 'Unknown',
                                    inline: true,
                                },
                                {
                                    name: 'Group:',
                                    value: bookData.group.length
                                        ? bookData.group.join(', ')
                                        : 'Unknown',
                                    inline: true,
                                },
                                {
                                    name: 'Parody:',
                                    value: bookData.parody.length
                                        ? bookData.parody.join(', ')
                                        : 'Unknown',
                                }
                            )
                            .addFields(
                                {
                                    name: 'Tags:',
                                    value: bookData.tags.length
                                        ? bookData.tags.sort().join(', ')
                                        : 'None',
                                },
                                {
                                    name: 'Pages:',
                                    value: globalRes.num_pages,
                                }
                            )
                            .setTimestamp(DateTime.fromSeconds(globalRes.upload_date))
                            .setFooter(
                                ` Favorites: ${globalRes.num_favorites}`,
                                'https://cdn0.iconfinder.com/data/icons/small-n-flat/24/678087-heart-512.png'
                            );
                        message.channel.send(embed);
                    });
            }catch (ex){
                return message.channel.send(ex.message.toString())
            }
            break
        case prefix2:
            try{

                api.getBook(parseInt(args[0])).then(book => {
                    api.getImageURL(book.cover);
                    const embeds = []
                    let i = 1
                    book.pages.forEach(page => {
                        embeds.push(new Discord.MessageEmbed().setTitle(book.title.pretty).setFooter(i).setImage(api.getImageURL(page)))
                        i++
                    })
                    pagination(message, embeds)
                });
            }catch(ex){
                return message.channel.send(ex.message.toString())
            }
            break
        case prefix3:
            try{
                api.getBook(parseInt(args[0])).then(book => {
                    api.getImageURL(book.cover);
                    if(args[1] == null){
                        return message.reply('Argument `page` required!')
                    }
                    if(book.pages.length > args[1]){
                        return message.reply(`Out of index; Max page is ${book.pages.length}`)
                    }
                    const page = book.pages[parseInt(args[1])]
                    message.channel.send(new Discord.MessageEmbed().setTitle(book.title.pretty).setFooter(page.id).setImage(api.getImageURL(page)))
                });
            }catch(ex){
                return message.channel.send(ex.message.toString())
            }
            break
        case prefix4:

            let getSauce = function(image) {
                sagi_client(image).then(response => {
                    let data = response[0];
                    console.log(response)
                    const minSimilarity = 30;
                    if (minSimilarity <= ~~data.similarity) {
                        message.channel.send({
                            embed: {
                                'title': 'Image sauce',
                                'image': {
                                    url: data.thumbnail
                                },
                                'fields': [ {
                                    'name': 'Title',
                                    'value': data.raw.data.title
                                }, {
                                    'name': 'Similarity',
                                    'value': `${data.similarity}%`
                                },{
                                    'name': 'Author',
                                    'value': `${data.authorName} - ${data.authorUrl}`
                                },{
                                    'name': 'Original site',
                                    'value': `${data.site} - ${data.url}`
                                }],
                                'color': 0xFA77ED
                            }
                        });
                    } else {
                        console.error('No Results found!');
                        message.channel.send('No Results found!');
                    }
                }).catch((error) => {
                    console.error(error.message);
                    error = error.toString();
                    if (error.includes('You need an image') || error.includes('Supplied URL is not usable') || error.includes('Error: Got HTML response while expecting JSON')) {
                        console.error('API Error!');
                        return message.channel.send('API Error!');
                    }
                });
            };
            if (!message.attachments.array()[0] && !args[0]) {
                console.error('Image attachment/URL not found!');
                message.channel.send('Please add an image, or image URL!');
            } else if (message.attachments.array()[0]) {
                console.log('Image attachment found!');
                if (isImageUrl(message.attachments.array()[0].url) && !notSupportedExts.has(path.extname(message.attachments.array()[0].url).slice(1).toLowerCase())) {
                    getSauce(message.attachments.array()[0].url);
                } else {
                    console.error('The file/extention is not an image!');
                    message.channel.send('The file/extention is not an image!');
                }
            } else if (args[0]) {
                console.log('Image URL found!');
                if (isImageUrl(args[0]) && !notSupportedExts.has(path.extname(args[0]).slice(1).toLowerCase())) {
                    getSauce(args[0]);
                } else {
                    console.error('The file/extention is not an image!');
                    message.channel.send('The file/extention is not an image!');
                }
            }
            break;
    }
});

client.login('ODU3MDgyOTI0OTU5OTI0MjI0.YNKarQ.5EtGhDU60XXzSB7jtRajruxZ3nk');
