package com.anpetna;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

@Controller
public class TestController {

    @GetMapping("/test")
    @ResponseBody
    public String test() {
        String data = "<h1>deploy succeed</h1>";
        data += "<h1>CICD test v1.0.0</h1>";

        return data;
    }
}
