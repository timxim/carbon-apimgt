/*
 * Copyright (c) 2019, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { Component } from 'react';
import {
    BrowserRouter as Router, Redirect, Route, Switch,
} from 'react-router-dom';
import qs from 'qs';
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles';
import { addLocaleData, defineMessages, IntlProvider } from 'react-intl';
import Configurations from 'Config';
import {
    Apis, ApplicationCreate, Applications, Base, Login, Logout,
} from './components';
import { PageNotFound } from './components/Base/Errors';
import AuthManager from './data/AuthManager';
import ApplicationEdit from './components/Applications/Edit/ApplicationEdit';

// import 'typeface-roboto'
import Utils from './data/Utils';
import ConfigManager from './data/ConfigManager';
import AnonymousView from './components/AnonymousView/AnonymousView';

const themes = [];

themes.push(createMuiTheme(Configurations.themes.light));
themes.push(createMuiTheme(Configurations.themes.dark));

/**
 * Language.
 * @type {string}
 */
const language = (navigator.languages && navigator.languages[0]) || navigator.language || navigator.userLanguage;

/**
 * Language without region code.
 */
const languageWithoutRegionCode = language.toLowerCase().split(/[_-]+/)[0];

/**
 * Render protected application paths
 *
 * @export
 * @class ProtectedApp
 * @extends {Component}
 */
export default class ProtectedApp extends Component {
    constructor(props) {
        super(props);
        this.state = {
            showLeftMenu: false,
            themeIndex: 0,
            messages: {},
        };
        this.environments = [];
        this.loadLocale = this.loadLocale.bind(this);
        /* TODO: need to fix the header to avoid conflicting with messages ~tmkb */
    }

    /**
     * Load locale file.
     *
     * @param {string} locale Locale name
     * @returns {Promise} Promise
     */
    loadLocale(locale = 'en') {
        fetch(`${Utils.CONST.CONTEXT_PATH}/public/app/locales/${locale}.json`)
            .then(resp => resp.json())
            .then((data) => {
                // eslint-disable-next-line global-require, import/no-dynamic-require
                addLocaleData(require(`react-intl/locale-data/${locale}`));
                this.setState({ messages: defineMessages(data) });
            });
    }

    /**
     * Component Mounted Lifecycle call back
     *
     * @memberof ProtectedApp
     */
    componentDidMount() {
        ConfigManager.getConfigs()
            .environments.then((response) => {
                this.environments = response.data.environments;
                this.handleEnvironmentQueryParam();
            })
            .catch((error) => {
                console.error('Error while receiving environment configurations : ', error);
            });
    }

    /**
     * Change the environment with "environment" query parameter
     *
     * @returns {String} environment name in the query param
     * @memberof ProtectedApp
     */
    handleEnvironmentQueryParam() {
        let queryString = this.props.location.search;
        queryString = queryString.replace(/^\?/, '');
        /* With QS version up we can directly use {ignoreQueryPrefix: true} option */
        const queryParams = qs.parse(queryString);
        const environmentName = queryParams.environment;

        if (!environmentName || Utils.getEnvironment() === environmentName) {
            // no environment query param or the same environment
            return environmentName;
        }

        const environmentId = Utils.getEnvironmentID(this.environments, environmentName);
        if (environmentId === -1) {
            return environmentName;
        }

        const environment = this.environments[environmentId];
        Utils.setEnvironment(environment);
        return environmentName;
    }

    /**
     *
     * Change the theme index incrementally
     * @memberof ProtectedApp
     */
    componentWillMount() {
        const storedThemeIndex = localStorage.getItem('themeIndex');
        if (storedThemeIndex) {
            this.setState({ themeIndex: parseInt(storedThemeIndex) });
        }
        const locale = languageWithoutRegionCode || language || 'en';
        this.loadLocale(locale);
    }

    /**
     * Set the theme to the state and store it in local storage
     *
     * @memberof ProtectedApp
     */
    setTheme() {
        this.setState({ theme: themes[this.state.themeIndex % 3] });
        this.state.themeIndex++;
        localStorage.setItem('themeIndex', this.state.themeIndex);
    }

    /**
     *
     *
     * @returns { Object }
     * @memberof ProtectedApp
     */
    render() {
        const environmentName = this.handleEnvironmentQueryParam();
        // Note: AuthManager.getUser() method is a passive check, which simply check the user availability in browser storage,
        // Not actively check validity of access token from backend
        if (AuthManager.getUser(environmentName)) {
            return (
                <IntlProvider locale={language} messages={this.state.messages}>
                    <MuiThemeProvider theme={themes[this.state.themeIndex % 2]}>
                        <Base setTheme={() => this.setTheme()}>
                            <Switch>
                                <Redirect exact from='/' to='/apis' />
                                <Route path='/apis' component={Apis} />
                                <Route path='/applications' component={Applications} />
                                <Route path='/application/create' component={ApplicationCreate} />
                                <Route path='/application/edit/:application_id' component={ApplicationEdit} />
                                <Route component={PageNotFound} />
                            </Switch>
                        </Base>
                    </MuiThemeProvider>
                </IntlProvider>
            );
        } else {
            return (
                <IntlProvider locale={language} messages={this.state.messages}>
                    <MuiThemeProvider theme={themes[this.state.themeIndex % 2]}>
                        <Base setTheme={() => this.setTheme()}>
                            <Route path='/' component={AnonymousView} />
                        </Base>
                    </MuiThemeProvider>
                </IntlProvider>
            );
        }

        const params = qs.stringify({ referrer: this.props.location.pathname });
        return <Redirect to={{ pathname: '/login', search: params }} />;
    }
}
