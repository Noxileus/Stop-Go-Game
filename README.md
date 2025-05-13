Stop-Go-Game
CSC 2463 Final Project
A web-based Red Light, Green Light game using p5.js and Arduino

Overview
Stop-Go-Game is a side-scrolling game inspired by Red Light, Green Light, developed using p5.js and the Arduino IDE. The game requires an Arduino with an RGB LED and a joystick to control player movement.

How to Play
Main Menu

Adjust the music volume in Settings

Click Play to begin

Arduino Connection

When prompted, connect to your Arduino port

The game won’t start until the connection is established

Game Objective

Your goal: Reach 10 points to win

You gain points by standing still during the red light

You lose points by:

Moving during the red light (−2 points)

Colliding with obstacles (−1 point)

Controls

Joystick: Move left and right

Spacebar: Jump (the only keyboard input)

RGB LED Rules
The LED cycles through green, yellow, and red

When green: Move and jump to avoid obstacles

When red: Stay completely still to earn points

Staying still the entire red cycle earns you +2 points

If your score reaches −10, you lose and must restart

Requirements
Arduino with:

RGB LED (pins 3, 5, 6)

Joystick (X on A0, Y on A1, button on pin 2)

USB connection to browser for serial communication


Game website video Example

https://files.fm/u/f8yjkdd3m3

Game hardware (ardunio breadboard)
https://files.fm/u/d98rcnkhb5

Image from game 

![image](https://github.com/user-attachments/assets/525810b9-59a6-4d7d-a1f0-a06ffd6c12e6)

