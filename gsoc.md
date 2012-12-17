## Google Summer of Code Proposal : Orbot & ORLib

*Sathyanarayanan, India*

_gsathya.ceg@gmail.com_

March 24 2011

### What project would you like to work on? 

I would like to work on Orbot and ORLib. 

#### Orbot UI/UX  

At the moment, the Orbot UI/UX is clustered and not very intuitive. I plan on improving the existing elements of the UI and also add a variety of new features such as 

* A new Set - up Wizard ( which checks for iptables ) 
* Improved LogView
* Changes to the preferences ( should be made to follow the Android guidelines)

I have already contacted my mentor (Nathan Freitas) and discussed the various UI/UX improvements ("here":https://docs.google.com/document/d/1RKMNK-yn-co9eO0njE7D-Lv20S45YE0GqBFgVl-utqE/edit?hl=en&authkey=CLHA_4IK ) and chalked out UI/UX wire frames ("here":https://github.com/guardianproject/Orbot/issues#issue/8 ).

#### Orbot Core app work 
 
At the moment, Orbot displays a successful connection without actually checking the connection. This is a pressing issue, because the user is not notified if the set-up has failed, unless he/she manually checks the torcheck web service. This should be made automatic by making using of the TorCheck API. Also, Orbot should be configured to show more information about the data being transmitted such as - 

* Amount of data transferred
* Quality of the connection
* Number of circuits connected

#### ORLib

Currently, ORLib is very minimal at the moment, both in term of features and support/documentation. ORLib is very critical to the use of Orbot as it provides transparent proxying on non-rooted devices ( A major chunk of android phones are un-rooted). I intend to -

* Improve the existing library by adding additional features
** Check if Orbot exists
** Check status of connection to Tor
** Provide option to start Orbot via intent
** Request hidden service by port, and get return hidden service .onion address

* Create an ORLib enabled "Twitter, Status.net or other micro blogging Client" - A sort of primer for third-party apps
* Improve the documentation 

#### Timeline

GSoC coding period starts on May 24 and ends on August 15 comprising a total of 12 weeks. 

##### Orbot

Week 1 - Get comfortable with Orbot source + minor tweaks ( such as updating info + links) 
Week 2 - Implement the new Set - Up Wizard
Week 3 - Improve the LogView + other minor UI tweaks (such as preferences)
Week 4 + Week 5 - Implement the various data statistics
Week 6 - Testing and tuning based on user response

##### ORLib

Week 7 + Week 8 - Add features to the library
Week 9 + Week 10 - Create an ORLib enabled App
Week 11  - Documentation + Testing

Week 12 - Code Cleanup

### Point us to a code sample: something good and clean to demonstrate that you know what you're doing, ideally from an existing project.
 
I hacked up an android app for showing the timings/schedule of the local trains here in India for my personal use. The source for this can be found "here":https://github.com/gsathya/TrainTrack

I've also submitted a "patch":https://lists.mayfirst.org/pipermail/guardian-dev/2011-March/000167.html to *Orbot* which is under review at the moment.

Also, I've made an bot for an IRC channel using Ruby. "Source":https://github.com/gsathya/Polkabot
 
### Why do you want to work with The Tor Project / EFF in particular?

I've always been very interested to Open source software development. I've been a big fan of android because of its open source morals. This was the main reason I took up android development. But, unfortunately I haven't had the chance to contribute to any open source project, until I found Orbot. I've been using Orbot on my phone for a while now and I've wanted to contribute back to the Tor community.

The recent crackdown in Egypt and Iran, show how vital Tor is to millions of people around the world, and this means that the work I do is going to be used by people all over the world. I'm thrilled to be a part of such an organisation, and can't wait to get started.

Oh and also, the "Tor T-shirt":https://www.torproject.org/getinvolved/tshirt.html . 

### Tell us about your experiences in free software development environments.

All of my above mentioned programs/applications are available on github. But I haven't had much experience with collaborative development, apart from the regular projects which I do with a group of friends as per my college curriculum.

### Will you be working full-time on the project for the summer, or will you have other commitments too (a second job, classes, etc)? 

I will be working full-time on the project. My college starts around July, after which I will be attending college for 3 to 4 hours. I intend to work late into the evening to make up for the lost time. Since, I've got my designs already approved, I can start hacking on the code right away. 

### Will your project need more work and/or maintenance after the summer ends? What are the chances you will stick around and help out with that and other related projects?

Yes, as development on the android platform is on a rapid pace, Orbot would need to be updated to keep up with every iteration of android. I plan to stick around and help with further development of Orbot and ORLib. Also more work needs to be done on ProxyMob, which unfortunately, I couldn't fit in my timeline. After GSoC, I intend on helping out with the TorButton port to Firefox 4 on Android. 

### What is your ideal approach to keeping everybody informed of your progress, problems, and questions over the course of the project? Said another way, how much of a "manager" will you need your mentor to be?

I will be available on IRC, IM, and via e-mail. I plan to stay in close touch with my mentor and others at Tor. I intend to check-in with my mentor once every week and report my progress. I plan on making use of version control software, so that my mentor can view my progress at any time. 

I also intend to blog about my progress on GSoC.

### What school are you attending? What year are you, and what's your major/degree/focus? If you're part of a research group, which one?

I'm a second year computer science undergrad at Anna University, India. My current project is to provide a two-key hashing algorithm for storing music files based on their characteristics(such as melody) rather than meta-data which is often error prone. 

### How can we contact you to ask you further questions? 

I'm usually idling on IRC. My nick is _gsathya_ on freenode & OFTC. Also my email-id is _gsathya.ceg@gmail.com_ .

### Is there anything else we should know that will make us like your project more?

I'm terrified of the dark !
