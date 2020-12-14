#include "ofApp.h"

void ofApp::setup() {
  activeShader.load("00");
  ofSetFrameRate(60);
  ofSetWindowTitle("tidalsun");
  ofSetWindowShape(1366, 768);

  osc.setup(5556);
  fbo.allocate(1000, 1000);
}

void ofApp::update() {
  if (osc.isListening()) {
    while (osc.hasWaitingMessages()) {
      ofxOscMessage msg;
      osc.getNextMessage(&msg);

      if (msg.getAddress() == "/ctrl/strobe")
        strobe = msg.getArgAsInt(0);
      else if (msg.getAddress() == "/ctrl/mode")
        mode = msg.getArgAsInt(0);

      seed = ofRandom(1.0f);
    }
  }
}

void ofApp::draw() {
  ofSetColor(255);

  float ww = (float)ofGetWidth() * 0.25;
  float wh = (float)ofGetHeight() * 0.25;
  float t = ofGetElapsedTimef() * 0.5;

  fbo.begin();
  ofClear(255, 255, 255, 255);
  activeShader.begin();
  activeShader.setUniform1f("time", t);
  activeShader.setUniform1i("mode", mode);
  activeShader.setUniform1f("seed", seed);
  activeShader.setUniform2f("resolution", ww, wh);
  activeShader.setUniform2f("mouse", ofGetMouseX() / 2, ofGetMouseY() / 2);
  ofDrawRectangle(0.0, 0.0, ww, wh);
  activeShader.end();
  ofSetColor(255.0f, 0.0f, 0.0f);
  ofDrawBitmapString(ofToString(ofGetFrameRate(), 0), 0, 10);
  fbo.end();

  ofScale(4.0, 4.0, 0.0);
  fbo.getTexture().setTextureMinMagFilter(GL_NEAREST, GL_NEAREST);
  fbo.draw(0, 0);
}
