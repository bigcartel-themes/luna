require 'dugway'

options = {}

# Use data from any store to make sure your theme looks great with all sorts of products, pages,
# categories, and more. Just give us the subdomain. Default is "dugway" for dugway.bigcartel.com.
# options[:store] = 'mystore'

# Simulate the customization done by store owners by passing values to different variables.
# Default values are based on the "default" for each setting in your settings.json.
# options[:customization] = {
# :logo => {
# :url => 'http://placehold.it/200x50/000000/ffffff&text=My+Logo',
# :width => 200,
# :height => 50
# },
# :background_color => '#CCCCCC',
# :show_search => true,
# :twitter_username => 'mytwitter'
# }
options[:customization] = {
:logo => {
:url => 'http://placehold.it/200x50/000000/ffffff&text=My+Logo'
},
:slideshow_images => [
{ :url => 'http://25.media.tumblr.com/f96beaeac4aa28da2dbcfb74750cf859/tumblr_n1oitodPIX1qalbcpo1_1280.jpg', :width => 1200, :height => 450 },
{ :url => 'http://24.media.tumblr.com/5ecde08c7e35af78a982f5bc13db7bb5/tumblr_n1hh0gVB3h1qalbcpo1_1280.jpg', :width => 1200, :height => 450 },
{ :url => 'http://24.media.tumblr.com/2b5e941a1afc9942f071956ea0aba3c6/tumblr_n19shshz0Q1qalbcpo1_1280.jpg', :width => 1200, :height => 450 }
]
}
run Dugway.application(options)