# Oddyserver
<img src="./images/oddyserver.png" width="200" height="200">

## What is Oddyserver?
Oddyserver is a moddable game server for the hit web game [Starblast.io](https://starblast.io/).

It is written in NodeJS and is designed to be easy to use and easy to modify.

It is currently in its infancy and is not ready for use.

## How do I use Oddyserver?
#### Oddyserver is not ready for non-developer use yet. If you are a developer, you can clone this repository and run 
```
npm install
```
to install the dependencies. Then, you can run
```
npm start
```
to start the server.

#### To connect to the server with the offical game client on [Starblast.io](https://starblast.io/). You must have a userscript manager like [Tampermonkey](https://www.tampermonkey.net/) for your browser.
#### Once you have a userscript manager, you can install the wsHook script from [here](./src/userscripts/wshook.js).



## Configuration
The configuration file is located at `src/config.json`. It takes the following options:
- `PORT`: The port to run the server on.
- `HOST`: The ip address to bind the server to.
- `MODE`: "SECURE" or "UNSECURE". Determines whether the server uses https or http.
- `KEY`: The path to the ssl key file. (Only used if `MODE` is "SECURE")
- `CERT`: The path to the ssl certificate file. (Only used if `MODE` is "SECURE")

## Contributing
#### Contributions are very appreciated.

If you would like to contribute to Oddyserver, you can fork this repository and make a pull request. Please make sure that your code is well documented and that it follows the style of the rest of the code.

## To do list
- [X] Clients connect to the server
- [X] Playerclose packet
- [X] Radar/Teamboard packet
- [1/2] Players can move around
- [1/4] Players can shoot
- [1/4] Players can upgrade their ship
- [ ] Players can collide with objects
- [ ] Players can mine asteroids
- [ ] Players can chat
- [ ] Server automatically detects the current join packet
- [ ] Various other things...

## Authors
<p align="center">
  <figure style="display: inline-block; text-align: center; width: 100px;">
    <a href="https://github.com/dpleshkov">
      <img src="https://avatars.githubusercontent.com/u/22554516?v=4" width="100" height="100">
    </a>
  </figure>
  <figure style="display: inline-block; text-align: center; width: 100px;">
    <a href="https://github.com/PixelMelt">
      <img src="https://avatars.githubusercontent.com/u/44953835?v=4" width="100" height="100">
    </a>
  </figure>
</p>
