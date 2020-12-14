#include "ofApp.h"
#include "ofMain.h"

//========================================================================
int main() {

#ifdef OF_TARGET_OPENGLES
  ofGLESWindowSettings settings;
  settings.glesVersion = 2;
#else
  ofGLWindowSettings settings;
  settings.setGLVersion(3, 2);
#endif
  ofCreateWindow(settings);

  ofRunApp(new ofApp());
}
