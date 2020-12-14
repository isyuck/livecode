#pragma once

#include "ofMain.h"
#include "ofxOsc.h"

class ofApp : public ofBaseApp {

public:
  void setup();
  void update();
  void draw();

  ofxOscReceiver osc;
  ofFbo fbo;
  ofShader prevShader;
  ofShader activeShader;

  // ctrl params from tidal
  unsigned char mode = 0;
  unsigned char strobe = 0;
  float seed = 0.0f;
};
