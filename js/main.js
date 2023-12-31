var debugmode = false;

var states = Object.freeze({
   SplashScreen: 0,
   GameScreen: 1,
   ScoreScreen: 2
});

var currentstate;

var gravity = 0.25;
var velocity = 0;
var position = 180;
var rotation = 0;
var jump = -4.6;
var flyArea = $("#flyarea").height();

var score = 0;
var highscore = 0;

var pipeheight = 90;
var pipewidth = 52;
var pipes = new Array();

var replayclickable = false;
var shareclickable = false;

var nopipes=false;
var paused=false;

//sounds
var volume = 30;
var soundJump = new buzz.sound("assets/sounds/sfx_wing.ogg");
var soundScore = new buzz.sound("assets/sounds/sfx_point.ogg");
var soundHit = new buzz.sound("assets/sounds/sfx_hit.ogg");
var soundDie = new buzz.sound("assets/sounds/sfx_die.ogg");
var soundSwoosh = new buzz.sound("assets/sounds/sfx_swooshing.ogg");
buzz.all().setVolume(volume);

//loops
var loopGameloop;
var loopPipeloop;


$(document).ready(function() {
	$("#my_audio").get(0).play();
   if(window.location.search == "?debug")
      debugmode = true;
   if(window.location.search == "?easy")
      pipeheight = 200;
   if(window.location.search == "?nopipes")
      nopipes=true;

   //get the highscore
   var savedscore = getCookie("highscore");
   if(savedscore != "")
      highscore = parseInt(savedscore);

   //start with the splash screen
   showSplash();
});

function getCookie(cname)
{
   var name = cname + "=";
   var ca = document.cookie.split(';');
   for(var i=0; i<ca.length; i++)
   {
      var c = ca[i].trim();
      if (c.indexOf(name)==0) return c.substring(name.length,c.length);
   }
   return "";
}

function setCookie(cname,cvalue,exdays)
{
   var d = new Date();
   d.setTime(d.getTime()+(exdays*24*60*60*1000));
   var expires = "expires="+d.toGMTString();
   document.cookie = cname + "=" + cvalue + "; " + expires;
}

function showSplash()
{
   currentstate = states.SplashScreen;

   //set the defaults (again)
   velocity = 0;
   position = 180;
   rotation = 0;
   score = 0;

   //update the player in preparation for the next game
   $("#player").css({ y: 0, x: 0 });
   updatePlayer($("#player"));

   soundSwoosh.stop();
   soundSwoosh.play();

   //clear out all the pipes if there are any
   $(".pipe").remove();
   pipes = new Array();

   //make everything animated again
   $(".animated").css('animation-play-state', 'running');
   $(".animated").css('-webkit-animation-play-state', 'running');

   //fade in the splash
   $("#splash").transition({ opacity: 1 }, 2000, 'ease');
}

function startGame()
{
   currentstate = states.GameScreen;

   //fade out the splash
   $("#splash").stop();
   $("#splash").transition({ opacity: 0 }, 500, 'ease');

   //update the big score
   setBigScore();

   //debug mode?
   if(debugmode)
   {
      //show the bounding boxes
      $(".boundingbox").show();
   }

   //start up our loops
   //var updaterate = 1000.0 / 60.0 ; //60 times a second
   //loopGameloop = setInterval(gameloop, updaterate);
   //if (!nopipes) {
     //loopPipeloop = setInterval(updatePipes, 1400);
     //loopPipeloop = setInterval(updatePipes, 1900);
   //}
   setGameLoops();

   //jump from the start!
   playerJump();
}

function updatePlayer(player)
{
   //rotation
   rotation = Math.min((velocity / 10) * 90, 90);

   //apply rotation and position
   $(player).css({ rotate: rotation, top: position });
}

function gameloop() {
   var player = $("#player");

   //update the player speed/position
   velocity += gravity;
   position += velocity;

   //update the player
   updatePlayer(player);

   //create the bounding box
   var box = document.getElementById('player').getBoundingClientRect();
   //var origwidth = 34.0;
   //var origheight = 24.0;
   var origwidth = 33.0;
   var origheight = 27.0;

   var boxwidth = origwidth - (Math.sin(Math.abs(rotation) / 90) * 8);
   var boxheight = (origheight + box.height) / 2;
   var boxleft = ((box.width - boxwidth) / 2) + box.left;
   var boxtop = ((box.height - boxheight) / 2) + box.top;
   var boxright = boxleft + boxwidth;
   var boxbottom = boxtop + boxheight;

   //if we're in debug mode, draw the bounding box
   if(debugmode)
   {
      var boundingbox = $("#playerbox");
      boundingbox.css('left', boxleft);
      boundingbox.css('top', boxtop);
      boundingbox.css('height', boxheight);
      boundingbox.css('width', boxwidth);
   }

   //did we hit the ground?
   //+60 cause the mountain land has some high peaks
   //while flying down when the land has low peaks it would just hit 
   //a blank area and die.
   //so bringing down land to hit and die by 60. Played around with. Seemed like a good number.
   if(box.bottom >= $("#land").offset().top+60)
   {
      playerDead();
      return;
   }

   //have they tried to escape through the ceiling? :o
   var ceiling = $("#ceiling");
   if(boxtop <= (ceiling.offset().top + ceiling.height()))
      position = 0;

   //we can't go any further without a pipe
   if(pipes[0] == null)
      return;

   //determine the bounding box of the next pipes inner area
   var nextpipe = pipes[0];
   var nextpipeupper = nextpipe.children(".pipe_upper");

   var pipetop = nextpipeupper.offset().top + nextpipeupper.height();
   var pipeleft = nextpipeupper.offset().left - 2; // for some reason it starts at the inner pipes offset, not the outer pipes.
   var piperight = pipeleft + pipewidth;
   var pipebottom = pipetop + pipeheight;

   if(debugmode)
   {
      var boundingbox = $("#pipebox");
      boundingbox.css('left', pipeleft);
      boundingbox.css('top', pipetop);
      boundingbox.css('height', pipeheight);
      boundingbox.css('width', pipewidth);
   }

   //have we gotten inside the pipe yet?
   if(boxright > pipeleft)
   {
      //we're within the pipe, have we passed between upper and lower pipes?
      // +7 to add some wiggle room cause the dragon has some transparency in the background
      if(boxtop > pipetop-7 && boxbottom < pipebottom+7)
      {
         //yeah! we're within bounds

      }
      else
      {
         //no! we touched the pipe
         playerDead();
         return;
      }
   }


   //have we passed the imminent danger?
   if(boxleft > piperight)
   {
      //yes, remove it
      pipes.splice(0, 1);

      //and score a point
      playerScore();
   }
}

//Handle space bar
$(document).keydown(function(e){
   //space bar!
   //console.log('Hee1', e.keyCode);
   if(e.keyCode == 32)
   {
      //in ScoreScreen, hitting space should click the "replay" button. else it's just a regular spacebar hit
      if(currentstate == states.ScoreScreen)
         $("#replay").click();
      else
         screenClick();

   } else if(e.keyCode == 112 || e.keyCode == 80) {
      if(currentstate != states.ScoreScreen)
         pause();
   }
});

//Handle mouse down OR touch start
if("ontouchstart" in window)
   $(document).on("touchstart", screenClick);
else
   $(document).on("mousedown", screenClick);

function pause() {
    if (!paused) {
			$(".animated").css('animation-play-state', 'paused');
			$(".animated").css('-webkit-animation-play-state', 'paused');
      removeGameLoops();
    } else {
      $(".animated").css('animation-play-state', 'running');
      $(".animated").css('-webkit-animation-play-state', 'running');
      setGameLoops();
    }
    paused=!paused;
}

function pauseAnimations() {
		$(".animated").css('animation-play-state', 'paused');
		$(".animated").css('-webkit-animation-play-state', 'paused');
}

function setGameLoops() {
		  var updaterate = 1000.0 / 60.0 ; //60 times a second
		  loopGameloop = setInterval(gameloop, updaterate);
		  if (!nopipes) {
			  //loopPipeloop = setInterval(updatePipes, 1400);
			  loopPipeloop = setInterval(updatePipes, 1600);
		  }
}

function removeGameLoops() {
		 //destroy our gameloops
		 clearInterval(loopGameloop);
		 clearInterval(loopPipeloop);
		 loopGameloop = null;
		 loopPipeloop = null;
}

function screenClick()
{
   if(currentstate == states.GameScreen)
   {
      playerJump();
   }
   else if(currentstate == states.SplashScreen)
   {
      startGame();
   }
}

function playerJump()
{
   velocity = jump;
   //play jump sound
   soundJump.stop();
   soundJump.play();
}

function setBigScore(erase)
{
   var elemscore = $("#bigscore");
   elemscore.empty();

   if(erase)
      return;

   var digits = score.toString().split('');
   for(var i = 0; i < digits.length; i++)
      elemscore.append("<img src='assets/font_big_" + digits[i] + ".png' alt='" + digits[i] + "'>");
}

function setSmallScore()
{
   var elemscore = $("#currentscore");
   elemscore.empty();

   var digits = score.toString().split('');
   for(var i = 0; i < digits.length; i++)
      elemscore.append("<img src='assets/font_small_" + digits[i] + ".png' alt='" + digits[i] + "'>");
}

function setHighScore()
{
   var elemscore = $("#highscore");
   elemscore.empty();

   var digits = highscore.toString().split('');
   for(var i = 0; i < digits.length; i++)
      elemscore.append("<img src='assets/font_small_" + digits[i] + ".png' alt='" + digits[i] + "'>");
}

function setMedal()
{
   var elemmedal = $("#medal");
   elemmedal.empty();

   if(score < 10)
      //signal that no medal has been won
      return false;

   if(score >= 10)
      medal = "bronze";
   if(score >= 20)
      medal = "silver";
   if(score >= 30)
      medal = "gold";
   if(score >= 40)
      medal = "platinum";

   //elemmedal.append('<img src="assets/medal_' + medal +'.png" alt="' + medal +'">');
   elemmedal.append('<img src="assets/fdmedal_' + medal +'.png" alt="' + medal +'">');

   //signal that a medal has been won
   return true;
}

function playerDead()
{
   //stop animating everything!
   pauseAnimations();

   //drop the bird to the floor
   var playerbottom = $("#player").position().top + $("#player").width(); //we use width because he'll be rotated 90 deg
   var floor = flyArea;
   var movey = Math.max(0, floor - playerbottom);
   $("#player").transition({ y: movey + 'px', rotate: 90}, 1000, 'easeInOutCubic');

   //it's time to change states. as of now we're considered ScoreScreen to disable left click/flying
   currentstate = states.ScoreScreen;

   //destroy our gameloops
   //clearInterval(loopGameloop);
   //clearInterval(loopPipeloop);
   //loopGameloop = null;
   //loopPipeloop = null;
   removeGameLoops();

   //mobile browsers don't support buzz bindOnce event
   if(isIncompatible.any())
   {
      //skip right to showing score
      showScore();
   }
   else
   {
      //play the hit sound (then the dead sound) and then show score
      soundHit.play().bindOnce("ended", function() {
         soundDie.play().bindOnce("ended", function() {
            showScore();
         });
      });
   }
}

function showScore()
{
   //unhide us
   $("#scoreboard").css("display", "block");

   //remove the big score
   setBigScore(true);

   //have they beaten their high score?
   if(score > highscore)
   {
      //yeah!
      highscore = score;
      //save it!
      setCookie("highscore", highscore, 999);
   }

   //update the scoreboard
   setSmallScore();
   setHighScore();
   var wonmedal = setMedal();

   //SWOOSH!
   soundSwoosh.stop();
   soundSwoosh.play();

   //show the scoreboard
   var scoreboard = ['scoreboard', 'replay', 'share', 'twitter-share-btn', 
                     'tg-share-btn', 'web-share-btn', 'whatsapp-share-btn', 
                     'linkedin-share-btn']
   for (let i=0; i < scoreboard.length; i++) {
       $("#"+scoreboard[i]).css({ y: '40px', opacity: 0 }); //move it down so we can slide it up
   }
   //$("#replay").css({ y: '40px', opacity: 0 });
   //$("#share").css({ y: '40px', opacity: 0 });
   //$("#twitter-share-btn").css({ y: '40px', opacity: 0 });

   $("#scoreboard").transition({ y: '0px', opacity: 1}, 600, 'ease', function() {
      //When the animation is done, animate in the replay button and SWOOSH!
      soundSwoosh.stop();
      soundSwoosh.play();
      // Starting from index 1 to skip the scoreboard itself as that is handled above
      for (let i=1; i < scoreboard.length; i++) {
          $("#"+scoreboard[i]).css({ y: '0px', opacity: 1 }, 600, 'ease'); 
      }
      //$("#replay").transition({ y: '0px', opacity: 1}, 600, 'ease');
      //$("#share").transition({ y: '0px', opacity: 1}, 600, 'ease');
      //$("#twitter-share-btn").transition({ y: '0px', opacity: 1}, 600, 'ease');

      //also animate in the MEDAL! WOO!
      if(wonmedal)
      {
         $("#medal").css({ scale: 2, opacity: 0 });
         $("#medal").transition({ opacity: 1, scale: 1 }, 1200, 'ease');
      }
   });

   //make the replay button clickable
   replayclickable = true;
   shareclickable = true;
}

$("#replay").click(function() {
   //make sure we can only click once
   if(!replayclickable)
      return;
   else
      replayclickable = false;
   //SWOOSH!
   soundSwoosh.stop();
   soundSwoosh.play();

   //fade out the scoreboard
   $("#scoreboard").transition({ y: '-40px', opacity: 0}, 1000, 'ease', function() {
      //when that's done, display us back to nothing
      $("#scoreboard").css("display", "none");

      //start the game over!
      showSplash();
   });
});

$("#share").click(function() {
   //make sure we can only click once
   /*
   if(!shareclickable)
      return;
   else
      shareclickable = false;
   */
   //SWOOSH!
   soundSwoosh.stop();
   soundSwoosh.play();

   const date = Date.now().toString();
   //day,month,year,hour,min=date.getDate(),date.getMonth(),date.FullYear(),date.Hours(),date.Minutes(),date.Seconds()
   //date_string=

   html2canvas(document.querySelector('#scoreboard'), {y:0, logging:false, height: 255}).then(function(canvas) {
      document.body.appendChild(canvas);
      simulateDownloadImageClick(canvas.toDataURL(), 'FlappyDragon_'+date+'.png');
   });
   //window.open("https://twitter.com/intent/tweet?text=Hello%20world")
});

function shareBtnClick(id) {
   //make sure we can only click once
   /*
   if(!shareclickable)
      return;
   else
      shareclickable = false;
   */
   //SWOOSH!
   soundSwoosh.stop();
   soundSwoosh.play();


   homeurl="https://iarunava.github.io/flappybird"
   title=spaceWith20("Flappy Dragon %2d Game Of Thrones")
   text=spaceWith20("Had fun playing this flappy bird remake for Game of Thrones%2e Flew through " + score.toString() + " castle towers%21 Can you beat me%3f")

   console.log(text)

   if (id.startsWith('twitter')) 
   {
       url="https://twitter.com/Incorgnitobsc";
   } 
   else if (id.startsWith('web')) 
   {
       url="https://www.incorgnito.live/";
   } 
   else if (id.startsWith('tg')) 
   {
      url="https://t.me/Incorgnitobsc";
   } 
   else if (id.startsWith('whatsapp')) 
   {
      url="whatsapp://send?text="+title+"\n"+text+" "+homeurl;
   } 
   else if (id.startsWith('linkedin')) 
   {
      url="https://www.linkedin.com/sharing/share-offsite/?mini=true&url="+homeurl+"&title="+title+"&summary="+text//+"&source={articleSource}";
   }

   window.open(url)

}

function spaceWith20(text) {
    return text.replaceAll(' ', '%20');
}

function playerScore()
{
   score += 1;
   //play score sound
   soundScore.stop();
   soundScore.play();
   setBigScore();
}

function simulateDownloadImageClick(uri, filename) {
  var link = document.createElement('a');
  if (typeof link.download !== 'string') {
    window.open(uri);
  } else {
    link.href = uri;
    link.download = filename;
    accountForFirefox(clickLink, link);
    //clickLink(link); #seems to be working fine
  }
}

function clickLink(link) {
  link.click();
}

function accountForFirefox(click) { // wrapper function
  let link = arguments[1];
  document.body.appendChild(link);
  click(link);
  document.body.removeChild(link);
}

function updatePipes()
{
   //Do any pipes need removal?
   $(".pipe").filter(function() { return $(this).position().left <= -100; }).remove()

   //add a new pipe (top height + bottom height  + pipeheight == flyArea) and put it in our tracker
   var padding = 80;
   var constraint = flyArea - pipeheight - (padding * 5); //double padding (for top and bottom)
   var topheight = Math.floor((Math.random()*constraint) + padding); //add lower padding
   var bottomheight = (flyArea - pipeheight) - topheight;
   var newpipe = $('<div class="pipe animated"><div class="pipe_upper" style="height: ' + topheight + 'px;"></div><div class="pipe_lower" style="height: ' + bottomheight + 'px;"></div></div>');
   $("#flyarea").append(newpipe);
   pipes.push(newpipe);
}

var isIncompatible = {
   Android: function() {
   return navigator.userAgent.match(/Android/i);
   },
   BlackBerry: function() {
   return navigator.userAgent.match(/BlackBerry/i);
   },
   iOS: function() {
   return navigator.userAgent.match(/iPhone|iPad|iPod/i);
   },
   Opera: function() {
   return navigator.userAgent.match(/Opera Mini/i);
   },
   Safari: function() {
   return (navigator.userAgent.match(/OS X.*Safari/) && ! navigator.userAgent.match(/Chrome/));
   },
   Windows: function() {
   return navigator.userAgent.match(/IEMobile/i);
   },
   any: function() {
   return (isIncompatible.Android() || isIncompatible.BlackBerry() || isIncompatible.iOS() || isIncompatible.Opera() || isIncompatible.Safari() || isIncompatible.Windows());
   }
};
