from manim import *

class HelloWorld(Scene):
    def construct(self):
        text = Tex("Hello World")
        self.play(Write(text))
        self.wait(1)