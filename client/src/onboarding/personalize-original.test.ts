// @vitest-environment jsdom
import {expect,it} from 'vitest'
import {personalizeOriginal} from './personalize-original'
import {emptyProfile} from './profile'
it('applies business details without replacing original design assets',()=>{
 const html='<html><head><link href="theme.css" rel="stylesheet"></head><body><a class="navbar-brand"><img src="old.png"></a><a href="tel:000">000</a><div class="hero"><p class="tagline">Old slogan</p></div><section id="about"><p>Old about</p></section><section id="services"><p>Old services</p></section><script src="app.js"></script></body></html>'
 const result=personalizeOriginal(html,{...emptyProfile,name:'Acme',logo:'data:image/png;base64,AAA',slogan:'A better slogan',about:'Our story',services:'Tutoring and courses',contact:{...emptyProfile.contact,mobile:'12345'}})
 expect(result).toContain('<title>Acme</title>');expect(result).toContain('tel:12345');expect(result).toContain('Our story');expect(result).toContain('Tutoring and courses');expect(result).toContain('A better slogan');expect(result).toContain('theme.css');expect(result).toContain('app.js')
})
it('swaps the sample brand, phone, email, address and social links wherever they are written',()=>{
 const html='<html><head><title>Zenith Dental - Home</title></head><body><a class="navbar-brand" href="#">Zenith Dental</a><p>Call +1 (555) 010-2030 or write hello@zenith.com</p><address>1 Old Street</address><footer>&copy; 2020 Zenith Dental</footer><a href="https://facebook.com/zenith">fb</a><span>Since 1999 - 12 rooms</span></body></html>'
 const result=personalizeOriginal(html,{...emptyProfile,name:'Sunrise Clinic',social:'https://facebook.com/sunrise',contact:{...emptyProfile.contact,mobile:'+91 98765 43210',email:'care@sunrise.in',address:'12 Main Road'}})
 expect(result).not.toContain('Zenith');expect(result).toContain('2020 Sunrise Clinic');expect(result).toContain('Call +91 98765 43210 or write care@sunrise.in');expect(result).toContain('12 Main Road');expect(result).toContain('https://facebook.com/sunrise')
 expect(result).toContain('Since 1999 - 12 rooms')
})
it('leaves the page alone when the visitor has not supplied a detail',()=>{
 const html='<html><head><title>Zenith</title></head><body><p>Call +1 (555) 010-2030</p></body></html>'
 expect(personalizeOriginal(html,emptyProfile)).toContain('+1 (555) 010-2030')
})
it('puts the address after each map pin, in text, in a sibling element, and in a wrapped icon, but leaves bare labels alone',()=>{
 const html='<html><head><title>Zenith</title></head><body><p><i class="fa fa-map-marker"></i> 123 Street, New York</p><li><i class="bi bi-geo-alt"></i><span>9 Old Road</span></li><div><span class="ic"><i class="ri-map-pin-2-fill"></i></span> Agra, India</div><a href="#"><i class="fa fa-map-marker"></i> Location</a></body></html>'
 const result=personalizeOriginal(html,{...emptyProfile,name:'Sunrise',contact:{...emptyProfile.contact,address:'12 Main Road'}})
 expect(result.match(/12 Main Road/g)).toHaveLength(3);expect(result).not.toContain('New York');expect(result).not.toContain('Old Road');expect(result).not.toContain('Agra');expect(result).toContain('> Location<')
})
