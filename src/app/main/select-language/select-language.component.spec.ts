import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { MatMenuModule } from '@angular/material/menu';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { SelectLanguageComponent } from './select-language.component';

const TRANSLATIONS_EN = require('../../../assets/i18n/en.json');
const TRANSLATIONS_DE = require('../../../assets/i18n/de.json');

describe('SelectLanguageComponent', () => {
    let component: SelectLanguageComponent;
    let fixture: ComponentFixture<SelectLanguageComponent>;

    let translate: TranslateService;
    let http: HttpTestingController;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [SelectLanguageComponent],
            imports: [
                HttpClientTestingModule,
                MatMenuModule,
                TranslateModule.forRoot()
            ],
            providers: [TranslateService]
        }).compileComponents();
        translate = TestBed.inject(TranslateService);
        http = TestBed.inject(HttpTestingController);
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(SelectLanguageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
